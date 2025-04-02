import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper
} from "@tanstack/react-table";
import { WorksheetData } from "@/types/excel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { utils, writeFile } from "xlsx";

interface ExcelTableProps {
  worksheet: WorksheetData;
}

const ExcelTable = ({ worksheet }: ExcelTableProps) => {
  const [sorting, setSorting] = useState([]);
  
  const columnHelper = createColumnHelper<any>();
  
  const columns = useMemo(() => {
    return worksheet.headers.map((header) => {
      return columnHelper.accessor(
        (row) => row[header].value, 
        {
          id: header,
          header: header,
          cell: (info) => {
            const value = info.getValue();
            // Format dates nicely
            if (value instanceof Date) {
              return value.toLocaleDateString();
            }
            return value?.toString() || "";
          },
        }
      );
    });
  }, [worksheet.headers]);

  const table = useReactTable({
    data: worksheet.data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting as any,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const exportToExcel = () => {
    // Create a new workbook
    const workbook = utils.book_new();
    
    // Convert the data to a worksheet format
    const wsData = [
      // Headers
      worksheet.headers,
      // Data rows
      ...worksheet.data.map(row => 
        worksheet.headers.map(header => row[header].value)
      )
    ];
    
    const ws = utils.aoa_to_sheet(wsData);
    
    // Add worksheet to workbook
    utils.book_append_sheet(workbook, ws, worksheet.name);
    
    // Generate file name
    const fileName = `${worksheet.fileName.split('.')[0]}_${worksheet.name}.xlsx`;
    
    // Write the workbook to a file and trigger download
    writeFile(workbook, fileName);
  };

  return (
    <div className="rounded-md border bg-white">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-medium">
          {worksheet.fileName} - {worksheet.name}
        </h3>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2">
          <Download size={16} />
          Export
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {
                      { asc: ' 🔼', desc: ' 🔽' }[
                        header.column.getIsSorted() as string
                      ] ?? null
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={worksheet.headers.length}
                  className="h-24 text-center"
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between p-4">
        <div className="text-sm text-gray-500">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {
            Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getPrePaginationRowModel().rows.length
            )
          } of {table.getPrePaginationRowModel().rows.length} entries
        </div>
        
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelTable;
