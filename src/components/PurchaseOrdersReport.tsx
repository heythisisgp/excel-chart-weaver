
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorksheetData } from "@/types/excel";
import MonthlyReportTable from "./MonthlyReportTable";
import MonthlyReportChart from "./MonthlyReportChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { ShoppingCart, TrendingUp } from "lucide-react";

interface PurchaseOrdersReportProps {
  excelData: WorksheetData[];
}

const PurchaseOrdersReport = ({ excelData }: PurchaseOrdersReportProps) => {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [poColumn, setPoColumn] = useState<string | null>(null);
  const [dateColumn, setDateColumn] = useState<string | null>(null);
  const [valueColumn, setValueColumn] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Find sheets with PO, date and numeric columns
  const eligibleSheets = useMemo(() => {
    return excelData.filter(sheet => {
      // Check if sheet has headers and data
      if (!sheet.headers.length || !sheet.data.length) return false;
      
      // Need at least one string/numeric column (for PO numbers), one date column and one numeric column (for values)
      const hasPoColumn = sheet.headers.some(header => {
        const sampleValue = sheet.data[0][header]?.value;
        return typeof sampleValue === 'string' || typeof sampleValue === 'number';
      });
      
      const hasDateColumn = sheet.headers.some(header => {
        const sampleValue = sheet.data[0][header]?.value;
        return typeof sampleValue === 'string' || sampleValue instanceof Date;
      });
      
      const hasNumericColumn = sheet.headers.some(header => {
        const sampleValue = sheet.data[0][header]?.value;
        return typeof sampleValue === 'number';
      });
      
      return hasPoColumn && hasDateColumn && hasNumericColumn;
    });
  }, [excelData]);

  // Get available columns from selected sheet
  const columns = useMemo(() => {
    if (!selectedSheet) return { poColumns: [], dateColumns: [], valueColumns: [] };
    
    const sheet = excelData.find(s => `${s.fileName}-${s.name}` === selectedSheet);
    if (!sheet) return { poColumns: [], dateColumns: [], valueColumns: [] };
    
    const poColumns: string[] = [];
    const dateColumns: string[] = [];
    const valueColumns: string[] = [];
    
    sheet.headers.forEach(header => {
      const sampleSize = Math.min(5, sheet.data.length);
      let hasPo = false;
      let hasDate = false;
      let hasNumber = false;
      
      for (let i = 0; i < sampleSize; i++) {
        const value = sheet.data[i][header]?.value;
        
        // Look for PO columns (strings or numbers that could be order IDs)
        if ((typeof value === 'string' && /order|po|purchase/i.test(header)) || 
            (typeof value === 'number' && /order|po|purchase/i.test(header))) {
          hasPo = true;
        }
        
        // Normal column type detection
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          hasDate = true;
        }
        if (typeof value === 'number') {
          hasNumber = true;
        }
      }
      
      if (hasPo || (typeof sheet.data[0][header]?.value === 'string' && /order|po|purchase/i.test(header))) {
        poColumns.push(header);
      }
      if (hasDate) {
        dateColumns.push(header);
      }
      if (hasNumber && !hasPo) { // Only consider value columns that aren't PO numbers
        valueColumns.push(header);
      }
    });
    
    return { poColumns, dateColumns, valueColumns };
  }, [selectedSheet, excelData]);

  // Get the currently selected sheet data
  const selectedSheetData = useMemo(() => {
    if (!selectedSheet) return null;
    return excelData.find(sheet => `${sheet.fileName}-${sheet.name}` === selectedSheet) || null;
  }, [selectedSheet, excelData]);

  // Get available months from data
  const availableMonths = useMemo(() => {
    if (!selectedSheetData || !dateColumn) return [];
    
    const months = new Set<string>();
    
    selectedSheetData.data.forEach(row => {
      try {
        let dateValue = row[dateColumn]?.value;
        if (!dateValue) return;
        
        // Convert to Date
        let date: Date;
        if (typeof dateValue === 'string') {
          date = new Date(dateValue);
          if (isNaN(date.getTime())) return;
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          return;
        }
        
        // Format as YYYY-MM (for sorting) and add display name
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        months.add(`${monthKey}|${monthName}`);
      } catch (error) {
        console.error("Error processing date:", error);
      }
    });
    
    // Sort months chronologically
    return Array.from(months)
      .map(item => {
        const [key, name] = item.split('|');
        return { key, name };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [selectedSheetData, dateColumn]);

  // Handle sheet change
  const handleSheetChange = (sheetId: string) => {
    setSelectedSheet(sheetId);
    setPoColumn(null);
    setDateColumn(null);
    setValueColumn(null);
    setSelectedMonth(null);
    
    // Auto-select columns
    const { poColumns, dateColumns, valueColumns } = columns;
    
    if (poColumns.length > 0) {
      setPoColumn(poColumns[0]);
    }
    
    if (dateColumns.length > 0) {
      setDateColumn(dateColumns[0]);
    }
    
    if (valueColumns.length > 0) {
      setValueColumn(valueColumns[0]);
    }
  };

  // Check if we can view report
  const canViewReport = selectedSheet && poColumn && dateColumn && valueColumn && selectedMonth;

  // Generate PO data for the selected month
  const poData = useMemo(() => {
    if (!canViewReport || !selectedSheetData) return [];
    
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
    
    const poMap = new Map<string, number>();
    
    selectedSheetData.data.forEach(row => {
      try {
        // Get date value
        let dateValue = row[dateColumn]?.value;
        if (!dateValue) return;
        
        // Convert to Date
        let date: Date;
        if (typeof dateValue === 'string') {
          date = new Date(dateValue);
          if (isNaN(date.getTime())) return;
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          return;
        }
        
        // Check if date is within selected month
        if (date < startDate || date > endDate) return;
        
        // Get PO identifier
        const poValue = row[poColumn]?.value;
        if (!poValue) return;
        const poId = String(poValue);
        
        // Get value
        const value = row[valueColumn]?.value;
        if (typeof value !== 'number') return;
        
        // Add to PO map
        if (poMap.has(poId)) {
          poMap.set(poId, poMap.get(poId)! + value);
        } else {
          poMap.set(poId, value);
        }
      } catch (error) {
        console.error("Error processing PO data:", error);
      }
    });
    
    // Convert map to array for display
    // We'll format it to match the MonthlyReportTable/Chart components
    return Array.from(poMap.entries())
      .map(([poId, total], index) => ({
        monthKey: String(index), // Using index as key 
        month: poId, // Using PO ID as "month" label
        total,
        date: new Date() // Dummy date since we're using components that expect date
      }))
      .sort((a, b) => b.total - a.total); // Sort by value descending
  }, [selectedSheetData, poColumn, dateColumn, valueColumn, selectedMonth, canViewReport]);

  const handleGenerateReport = () => {
    if (poData.length === 0) {
      toast.warning("No purchase order data found for the selected month");
    } else {
      toast.success(`Found ${poData.length} purchase orders for ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Purchase Orders Report</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Worksheet</label>
              <Select 
                value={selectedSheet || ""} 
                onValueChange={handleSheetChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose data source" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSheets.length ? (
                    eligibleSheets.map(sheet => (
                      <SelectItem 
                        key={`${sheet.fileName}-${sheet.name}`} 
                        value={`${sheet.fileName}-${sheet.name}`}
                      >
                        {sheet.fileName} - {sheet.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No eligible worksheets found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PO Column</label>
              <Select 
                value={poColumn || ""} 
                onValueChange={setPoColumn}
                disabled={!selectedSheet}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.poColumns.length ? (
                    columns.poColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No PO columns found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Column</label>
              <Select 
                value={dateColumn || ""} 
                onValueChange={setDateColumn}
                disabled={!selectedSheet}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.dateColumns.length ? (
                    columns.dateColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No date columns found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value Column</label>
              <Select 
                value={valueColumn || ""} 
                onValueChange={setValueColumn}
                disabled={!selectedSheet}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select value column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.valueColumns.length ? (
                    columns.valueColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No numeric columns found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <Select 
                value={selectedMonth || ""} 
                onValueChange={setSelectedMonth}
                disabled={!dateColumn || availableMonths.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.length ? (
                    availableMonths.map(month => (
                      <SelectItem key={month.key} value={month.key}>
                        {month.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No months available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateReport}
            disabled={!canViewReport} 
            className="w-full md:w-auto mb-6"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Generate PO Report
          </Button>

          {/* Report Visualizations */}
          {canViewReport && poData.length > 0 && (
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="mt-2">
                <MonthlyReportChart 
                  data={poData} 
                  valueColumnName={`Purchase Orders (${valueColumn})`} 
                />
              </TabsContent>
              
              <TabsContent value="table" className="mt-2">
                <MonthlyReportTable 
                  data={poData} 
                  valueColumnName={`Purchase Orders (${valueColumn})`} 
                />
              </TabsContent>
            </Tabs>
          )}

          {/* No Data Message */}
          {canViewReport && poData.length === 0 && (
            <div className="text-center p-8 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-gray-500">
                No purchase order data found for the selected month. 
                Try selecting a different month or check your data.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseOrdersReport;
