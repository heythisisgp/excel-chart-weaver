
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorksheetData } from "@/types/excel";
import MonthlyReportTable from "./MonthlyReportTable";
import MonthlyReportChart from "./MonthlyReportChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { CalendarIcon, DollarSign } from "lucide-react";

interface MonthlyReportProps {
  excelData: WorksheetData[];
  combineData?: boolean;
}

/**
 * This component handles the monthly financial reports visualization.
 * It allows users to select a financial dataset and view it in different formats.
 */
const MonthlyReport = ({ excelData, combineData = true }: MonthlyReportProps) => {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [dateColumn, setDateColumn] = useState<string | null>(null);
  const [valueColumn, setValueColumn] = useState<string | null>(null);

  // Find sheets with date and numeric columns for potential financial data
  const eligibleSheets = useMemo(() => {
    return excelData.filter(sheet => {
      // Check if sheet has headers and data
      if (!sheet.headers.length || !sheet.data.length) return false;
      
      // Need at least one date/string column and one numeric column
      const hasDateColumn = sheet.headers.some(header => {
        const firstValue = sheet.data[0][header]?.value;
        return typeof firstValue === 'string' || firstValue instanceof Date;
      });
      
      const hasNumericColumn = sheet.headers.some(header => {
        const firstValue = sheet.data[0][header]?.value;
        return typeof firstValue === 'number';
      });
      
      return hasDateColumn && hasNumericColumn;
    });
  }, [excelData]);

  // Get available columns from selected sheet
  const columns = useMemo(() => {
    if (!selectedSheet) return { dateColumns: [], valueColumns: [] };
    
    const sheet = excelData.find(s => `${s.fileName}-${s.name}` === selectedSheet);
    if (!sheet) return { dateColumns: [], valueColumns: [] };
    
    const dateColumns: string[] = [];
    const valueColumns: string[] = [];
    
    sheet.headers.forEach(header => {
      // Check first few rows to determine column type
      const sampleSize = Math.min(5, sheet.data.length);
      let hasDate = false;
      let hasNumber = false;
      
      for (let i = 0; i < sampleSize; i++) {
        const value = sheet.data[i][header]?.value;
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          hasDate = true;
        }
        if (typeof value === 'number') {
          hasNumber = true;
        }
      }
      
      if (hasDate) {
        dateColumns.push(header);
      }
      if (hasNumber) {
        valueColumns.push(header);
      }
    });
    
    return { dateColumns, valueColumns };
  }, [selectedSheet, excelData]);

  // Get the currently selected sheet data
  const selectedSheetData = useMemo(() => {
    if (!selectedSheet) return null;
    return excelData.find(sheet => `${sheet.fileName}-${sheet.name}` === selectedSheet) || null;
  }, [selectedSheet, excelData]);

  // When user selects a sheet, auto-select the first date and value columns if available
  const handleSheetChange = (sheetId: string) => {
    setSelectedSheet(sheetId);
    setDateColumn(null);
    setValueColumn(null);
    
    // Find the sheet
    const sheet = excelData.find(s => `${s.fileName}-${s.name}` === sheetId);
    if (!sheet) return;
    
    // Get columns
    const { dateColumns, valueColumns } = columns;
    
    // Auto-select first date and value columns
    if (dateColumns.length > 0) {
      setDateColumn(dateColumns[0]);
    }
    
    if (valueColumns.length > 0) {
      setValueColumn(valueColumns[0]);
    }
  };

  // Only allow report viewing when all required selections are made
  const canViewReport = selectedSheet && dateColumn && valueColumn;

  // Generate monthly data from the selected columns
  const monthlyData = useMemo(() => {
    if (!canViewReport || !selectedSheetData) return [];
    
    // Map to store aggregated monthly data
    const monthlyMap = new Map<string, number>();
    
    // Process each row in the sheet
    selectedSheetData.data.forEach(row => {
      try {
        // Get the date value
        let dateValue = row[dateColumn]?.value;
        if (!dateValue) return;
        
        // Convert string to Date if needed
        let date: Date;
        if (typeof dateValue === 'string') {
          date = new Date(dateValue);
          if (isNaN(date.getTime())) return; // Skip invalid dates
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          return; // Skip non-date values
        }
        
        // Add source tracking if we're combining data
        const source = selectedSheetData.fileName;
        
        // Get the month-year key
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Get the numeric value
        const value = row[valueColumn]?.value;
        if (typeof value !== 'number') return;
        
        // Add to monthly total
        if (monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + value);
        } else {
          monthlyMap.set(monthKey, value);
        }
      } catch (error) {
        console.error("Error processing row for monthly report:", error);
      }
    });
    
    // Convert map to array of objects and sort by date
    return Array.from(monthlyMap.entries())
      .map(([monthKey, total]) => {
        const [year, month] = monthKey.split('-');
        return {
          monthKey,
          month: `${month}/${year}`,
          total,
          date: new Date(parseInt(year), parseInt(month) - 1, 1),
          source: selectedSheetData.fileName // Include source for combined data views
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
  }, [selectedSheetData, dateColumn, valueColumn, canViewReport]);

  const handleGenerateReport = () => {
    if (monthlyData.length === 0) {
      toast.warning("No valid monthly data found. Please check your column selections.");
    } else {
      toast.success(`Generated monthly report with ${monthlyData.length} months of data`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          <span>Monthly Financial Report {combineData ? "(Combined Data)" : ""}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        </div>

        <Button 
          onClick={handleGenerateReport}
          disabled={!canViewReport} 
          className="w-full md:w-auto mb-6"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Generate Monthly Report
        </Button>

        {/* Report Visualizations */}
        {canViewReport && monthlyData.length > 0 && (
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-2">
              <MonthlyReportChart 
                data={monthlyData} 
                valueColumnName={valueColumn || ""} 
              />
            </TabsContent>
            
            <TabsContent value="table" className="mt-2">
              <MonthlyReportTable 
                data={monthlyData} 
                valueColumnName={valueColumn || ""} 
                showSource={combineData && excelData.length > 1}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* No Data Message */}
        {canViewReport && monthlyData.length === 0 && (
          <div className="text-center p-8 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-gray-500">
              No monthly data could be generated with the selected columns. 
              Try selecting different date or value columns.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;
