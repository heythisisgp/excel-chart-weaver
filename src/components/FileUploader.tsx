
import { useState } from "react";
import { read, utils } from "xlsx";
import { Button } from "@/components/ui/button";
import { WorksheetData } from "@/types/excel";
import { toast } from "sonner";
import { Upload, FileX } from "lucide-react";

interface FileUploaderProps {
  onDataExtracted: (data: WorksheetData[], fileName: string) => void;
  onClearData: () => void;
}

const FileUploader = ({ onDataExtracted, onClearData }: FileUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const processExcelFile = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      
      const worksheetsData: WorksheetData[] = [];
      
      // Process each worksheet in the Excel file
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet);
        
        // Convert to array of arrays for raw data
        const rawData = utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          continue; // Skip empty worksheets
        }
        
        // Extract headers from the first row
        const headers = Object.keys(jsonData[0]);
        
        // Process data to ensure consistent structure with cell values
        const processedData = jsonData.map((row: any) => {
          const processedRow: Record<string, any> = {};
          
          headers.forEach(header => {
            const value = row[header];
            
            processedRow[header] = {
              value,
              formatted: value !== null && value !== undefined ? value.toString() : ''
            };
          });
          
          return processedRow;
        });
        
        worksheetsData.push({
          name: sheetName,
          fileName: file.name,
          headers,
          data: processedData,
          rawData
        });
      }
      
      if (worksheetsData.length === 0) {
        toast.error("No valid data found in the Excel file");
        return;
      }
      
      onDataExtracted(worksheetsData, file.name);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast.error("Error processing Excel file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file");
      return;
    }
    
    processExcelFile(file);
    // Reset the input to allow uploading the same file again
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8 transition-all hover:border-blue-500">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Upload Excel Files</h3>
        <p className="mt-1 text-sm text-gray-500">Upload your .xlsx, .xls, or .csv files</p>
        
        <div className="mt-4">
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            disabled={isLoading}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            {isLoading ? "Processing..." : "Select File"}
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="destructive" 
          onClick={onClearData}
          className="flex items-center gap-2"
        >
          <FileX size={16} />
          Clear Data
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
