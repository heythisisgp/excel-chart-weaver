
import { Card, CardContent } from "@/components/ui/card";
import { WorksheetData } from "@/types/excel";
import { FileSpreadsheet, Table, BarChart, FileText } from "lucide-react";

interface DashboardStatsProps {
  excelData: WorksheetData[];
  fileNames: string[];
}

const DashboardStats = ({ excelData, fileNames }: DashboardStatsProps) => {
  // Calculate stats
  const totalFiles = fileNames.length;
  const totalSheets = excelData.length;
  const totalRows = excelData.reduce((sum, sheet) => sum + sheet.data.length, 0);
  const totalColumns = excelData.reduce((sum, sheet) => sum + sheet.headers.length, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
      <Card className="bg-white border-l-4 border-l-blue-500">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-blue-100 p-3 rounded-full">
            <FileSpreadsheet className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Files Loaded</p>
            <p className="text-2xl font-bold">{totalFiles}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-l-4 border-l-green-500">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-green-100 p-3 rounded-full">
            <FileText className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Worksheets</p>
            <p className="text-2xl font-bold">{totalSheets}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-l-4 border-l-amber-500">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-amber-100 p-3 rounded-full">
            <Table className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Rows</p>
            <p className="text-2xl font-bold">{totalRows}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-l-4 border-l-purple-500">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-purple-100 p-3 rounded-full">
            <BarChart className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Columns</p>
            <p className="text-2xl font-bold">{totalColumns}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
