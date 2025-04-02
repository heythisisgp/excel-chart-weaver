
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/FileUploader";
import ExcelTable from "@/components/ExcelTable";
import ChartViewer from "@/components/ChartViewer";
import DashboardStats from "@/components/DashboardStats";
import MonthlyReport from "@/components/MonthlyReport";
import ProjectReport from "@/components/ProjectReport";
import PurchaseOrdersReport from "@/components/PurchaseOrdersReport";
import { WorksheetData } from "@/types/excel";
import { toast } from "sonner";

const Index = () => {
  const [excelData, setExcelData] = useState<WorksheetData[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleExcelData = (data: WorksheetData[], fileName: string) => {
    // Check if file is already loaded
    if (fileNames.includes(fileName)) {
      toast.error(`File ${fileName} is already loaded`);
      return;
    }

    // Add the new file data to existing data
    setExcelData([...excelData, ...data]);
    setFileNames([...fileNames, fileName]);
    
    // Set the active file to the first one if none is active yet
    if (!activeFile) {
      setActiveFile(data[0]?.name || null);
    }

    toast.success(`Successfully loaded ${fileName}`);
  };

  const getActiveWorksheet = () => {
    return excelData.find(sheet => sheet.name === activeFile);
  };

  const getUniqueFileNames = () => {
    return [...new Set(excelData.map(sheet => sheet.fileName))];
  };

  const handleClearData = () => {
    setExcelData([]);
    setActiveFile(null);
    setFileNames([]);
    toast.info("All data has been cleared");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-in">Excel Chart Weaver</h1>
          <p className="text-blue-100 animate-slide-up">Transform your Excel data into beautiful visualizations</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-3 animate-fade-in">
            <CardContent className="p-6">
              <FileUploader onDataExtracted={handleExcelData} onClearData={handleClearData} />
            </CardContent>
          </Card>
        </div>

        {excelData.length > 0 && (
          <>
            <DashboardStats excelData={excelData} fileNames={getUniqueFileNames()} />

            <div className="mt-8 mb-8">
              <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
                  <TabsTrigger value="project">Project Report</TabsTrigger>
                  <TabsTrigger value="po">Purchase Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="monthly">
                  <MonthlyReport excelData={excelData} />
                </TabsContent>
                
                <TabsContent value="project">
                  <ProjectReport excelData={excelData} />
                </TabsContent>
                
                <TabsContent value="po">
                  <PurchaseOrdersReport excelData={excelData} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="mt-8">
              <Tabs defaultValue="charts" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="tables">Tables</TabsTrigger>
                </TabsList>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mr-2">Select Worksheet:</label>
                  <select 
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    value={activeFile || ''}
                    onChange={(e) => setActiveFile(e.target.value)}
                  >
                    {excelData.map((sheet, index) => (
                      <option key={index} value={sheet.name}>
                        {sheet.fileName} - {sheet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <TabsContent value="charts" className="animate-fade-in">
                  {getActiveWorksheet() && (
                    <ChartViewer worksheet={getActiveWorksheet()!} />
                  )}
                </TabsContent>
                
                <TabsContent value="tables" className="animate-fade-in">
                  {getActiveWorksheet() && (
                    <ExcelTable worksheet={getActiveWorksheet()!} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>

      <footer className="bg-gray-800 text-gray-300 py-6">
        <div className="container mx-auto px-4 text-center">
          <p>Excel Chart Weaver | Create beautiful visualizations from your Excel data</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
