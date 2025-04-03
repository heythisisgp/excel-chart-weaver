
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorksheetData } from "@/types/excel";
import MonthlyReportTable from "./MonthlyReportTable";
import MonthlyReportChart from "./MonthlyReportChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { ClipboardList, BarChart, CalendarRange } from "lucide-react";

interface ProjectReportProps {
  excelData: WorksheetData[];
}

const ProjectReport = ({ excelData }: ProjectReportProps) => {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [projectColumn, setProjectColumn] = useState<string | null>(null);
  const [dateColumn, setDateColumn] = useState<string | null>(null);
  const [valueColumn, setValueColumn] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Find sheets with project, date and numeric columns
  const eligibleSheets = useMemo(() => {
    return excelData.filter(sheet => {
      // Check if sheet has headers and data
      if (!sheet.headers.length || !sheet.data.length) return false;
      
      // Need at least one string column (for project names), one date column and one numeric column
      const hasStringColumns = sheet.headers.some(header => {
        const firstValue = sheet.data[0][header]?.value;
        return typeof firstValue === 'string';
      });
      
      const hasDateColumn = sheet.headers.some(header => {
        const firstValue = sheet.data[0][header]?.value;
        return typeof firstValue === 'string' || firstValue instanceof Date;
      });
      
      const hasNumericColumn = sheet.headers.some(header => {
        const firstValue = sheet.data[0][header]?.value;
        return typeof firstValue === 'number';
      });
      
      return hasStringColumns && hasDateColumn && hasNumericColumn;
    });
  }, [excelData]);

  // Get available columns from selected sheet
  const columns = useMemo(() => {
    if (!selectedSheet) return { stringColumns: [], dateColumns: [], valueColumns: [] };
    
    const sheet = excelData.find(s => `${s.fileName}-${s.name}` === selectedSheet);
    if (!sheet) return { stringColumns: [], dateColumns: [], valueColumns: [] };
    
    const stringColumns: string[] = [];
    const dateColumns: string[] = [];
    const valueColumns: string[] = [];
    
    sheet.headers.forEach(header => {
      // Check first few rows to determine column type
      const sampleSize = Math.min(5, sheet.data.length);
      let hasString = false;
      let hasDate = false;
      let hasNumber = false;
      
      for (let i = 0; i < sampleSize; i++) {
        const value = sheet.data[i][header]?.value;
        if (typeof value === 'string' && value.length > 0) {
          hasString = true;
        }
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          hasDate = true;
        }
        if (typeof value === 'number') {
          hasNumber = true;
        }
      }
      
      if (hasString && !hasDate) {
        stringColumns.push(header);
      }
      if (hasDate) {
        dateColumns.push(header);
      }
      if (hasNumber) {
        valueColumns.push(header);
      }
    });
    
    return { stringColumns, dateColumns, valueColumns };
  }, [selectedSheet, excelData]);

  // Get the currently selected sheet data
  const selectedSheetData = useMemo(() => {
    if (!selectedSheet) return null;
    return excelData.find(sheet => `${sheet.fileName}-${sheet.name}` === selectedSheet) || null;
  }, [selectedSheet, excelData]);

  // Get unique project values
  const projectValues = useMemo(() => {
    if (!selectedSheetData || !projectColumn) return [];
    
    const values = new Set<string>();
    selectedSheetData.data.forEach(row => {
      const value = row[projectColumn]?.value;
      if (typeof value === 'string' && value.trim() !== '') {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  }, [selectedSheetData, projectColumn]);

  // Get unique month values from the data
  const availableMonths = useMemo(() => {
    if (!selectedSheetData || !dateColumn) return [];
    
    const months = new Set<string>();
    
    selectedSheetData.data.forEach(row => {
      try {
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
        
        // Format as "MM/YYYY"
        const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        months.add(monthYear);
      } catch (error) {
        console.error("Error processing date:", error);
      }
    });
    
    // Sort months chronologically
    return Array.from(months).sort((a, b) => {
      const [aMonth, aYear] = a.split('/');
      const [bMonth, bYear] = b.split('/');
      
      const aDate = new Date(parseInt(aYear), parseInt(aMonth) - 1, 1);
      const bDate = new Date(parseInt(bYear), parseInt(bMonth) - 1, 1);
      
      return aDate.getTime() - bDate.getTime();
    });
  }, [selectedSheetData, dateColumn]);

  // Handle sheet selection
  const handleSheetChange = (sheetId: string) => {
    setSelectedSheet(sheetId);
    setProjectColumn(null);
    setDateColumn(null);
    setValueColumn(null);
    setSelectedProject(null);
    setSelectedMonth(null);
    
    // Auto-select columns
    const sheet = excelData.find(s => `${s.fileName}-${s.name}` === sheetId);
    if (!sheet) return;
    
    const { stringColumns, dateColumns, valueColumns } = columns;
    
    if (stringColumns.length > 0) {
      setProjectColumn(stringColumns[0]);
    }
    
    if (dateColumns.length > 0) {
      setDateColumn(dateColumns[0]);
    }
    
    if (valueColumns.length > 0) {
      setValueColumn(valueColumns[0]);
    }
  };

  // Check if we can view report
  const canViewReport = selectedSheet && projectColumn && dateColumn && valueColumn && selectedProject;

  // Generate project data filtered by month if selected
  const projectData = useMemo(() => {
    if (!canViewReport || !selectedSheetData) return [];
    
    // Store data points for the selected project
    const dataPoints: Array<{
      date: Date;
      value: number;
      month: string;
      monthKey: string;
    }> = [];
    
    // Process each row in the sheet
    selectedSheetData.data.forEach(row => {
      try {
        // Check if this row is for the selected project
        const projectValue = row[projectColumn]?.value;
        if (typeof projectValue !== 'string' || projectValue !== selectedProject) return;
        
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
        
        // Get the month-year for filtering
        const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        
        // Filter by month if one is selected
        if (selectedMonth && monthYear !== selectedMonth) return;
        
        // Get the numeric value
        const value = row[valueColumn]?.value;
        if (typeof value !== 'number') return;
        
        // Add to data points
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        dataPoints.push({
          date,
          value,
          month: monthYear,
          monthKey
        });
      } catch (error) {
        console.error("Error processing row for project report:", error);
      }
    });
    
    // If we're not filtering by month, aggregate by month
    if (!selectedMonth) {
      // Map to store aggregated monthly data
      const monthlyMap = new Map<string, number>();
      
      // Aggregate values by month
      dataPoints.forEach(point => {
        if (monthlyMap.has(point.monthKey)) {
          monthlyMap.set(point.monthKey, monthlyMap.get(point.monthKey)! + point.value);
        } else {
          monthlyMap.set(point.monthKey, point.value);
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
            date: new Date(parseInt(year), parseInt(month) - 1, 1)
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } else {
      // When filtering by month, return individual data points
      return dataPoints.map(point => ({
        monthKey: point.monthKey,
        month: point.month,
        total: point.value,
        date: point.date
      })).sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
  }, [selectedSheetData, projectColumn, dateColumn, valueColumn, selectedProject, selectedMonth, canViewReport]);

  const handleGenerateReport = () => {
    if (projectData.length === 0) {
      toast.warning(selectedMonth 
        ? `No data found for project "${selectedProject}" in month ${selectedMonth}` 
        : "No data found for this project. Try selecting different columns or project."
      );
    } else {
      toast.success(`Generated project report with ${projectData.length} ${selectedMonth ? "entries" : "months"} of data`);
    }
  };

  // Generate a title based on selections
  const reportTitle = useMemo(() => {
    if (!selectedProject) return "Project Report";
    return selectedMonth 
      ? `${selectedProject} - ${selectedMonth}` 
      : `${selectedProject} - All Months`;
  }, [selectedProject, selectedMonth]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <span>Project Based Report</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Column</label>
              <Select 
                value={projectColumn || ""} 
                onValueChange={setProjectColumn}
                disabled={!selectedSheet}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.stringColumns.length ? (
                    columns.stringColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No text columns found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
              <Select 
                value={selectedProject || ""} 
                onValueChange={setSelectedProject}
                disabled={!projectColumn || projectValues.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projectValues.length ? (
                    projectValues.map(project => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No projects found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Month (Optional)</label>
              <Select 
                value={selectedMonth || ""} 
                onValueChange={(value) => setSelectedMonth(value || null)}
                disabled={!dateColumn || availableMonths.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Months</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateReport}
            disabled={!canViewReport} 
            className="w-full md:w-auto mb-6"
          >
            <BarChart className="mr-2 h-4 w-4" />
            Generate Project Report
          </Button>

          {/* Report Visualizations */}
          {canViewReport && projectData.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  {reportTitle}
                </h3>
              </div>
              
              <Tabs defaultValue="chart" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>

                <TabsContent value="chart" className="mt-2">
                  <MonthlyReportChart 
                    data={projectData} 
                    valueColumnName={`${selectedProject} (${valueColumn})`} 
                  />
                </TabsContent>
                
                <TabsContent value="table" className="mt-2">
                  <MonthlyReportTable 
                    data={projectData} 
                    valueColumnName={`${selectedProject} (${valueColumn})`} 
                  />
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* No Data Message */}
          {canViewReport && projectData.length === 0 && (
            <div className="text-center p-8 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-gray-500">
                {selectedMonth 
                  ? `No data found for project "${selectedProject}" in month ${selectedMonth}.` 
                  : `No data found for project "${selectedProject}".`}
                <br />
                Try selecting a different project or month.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectReport;
