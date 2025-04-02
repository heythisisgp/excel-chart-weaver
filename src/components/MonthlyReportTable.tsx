
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface MonthlyDataPoint {
  monthKey: string;
  month: string;
  total: number;
  date: Date;
}

interface MonthlyReportTableProps {
  data: MonthlyDataPoint[];
  valueColumnName: string;
}

const MonthlyReportTable = ({ data, valueColumnName }: MonthlyReportTableProps) => {
  // Calculate totals and statistics
  const totalSum = data.reduce((sum, item) => sum + item.total, 0);
  const average = totalSum / data.length;
  const highest = Math.max(...data.map(item => item.total));
  const lowest = Math.min(...data.map(item => item.total));

  // Function to format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{data[0]?.date instanceof Date ? "Month" : "Item"}</TableHead>
                <TableHead>{valueColumnName}</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const percentOfTotal = (item.total / totalSum) * 100;
                
                return (
                  <TableRow key={item.monthKey}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell>{formatCurrency(item.total)}</TableCell>
                    <TableCell className="text-right">
                      {percentOfTotal.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Summary statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Total</h4>
          <p className="text-2xl font-bold">{formatCurrency(totalSum)}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Average</h4>
          <p className="text-2xl font-bold">{formatCurrency(average)}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Highest</h4>
          <p className="text-2xl font-bold">{formatCurrency(highest)}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Lowest</h4>
          <p className="text-2xl font-bold">{formatCurrency(lowest)}</p>
        </Card>
      </div>
    </div>
  );
};

export default MonthlyReportTable;
