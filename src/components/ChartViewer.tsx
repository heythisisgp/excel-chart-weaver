
import { useState, useMemo } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChartConfig, ChartType, WorksheetData } from "@/types/excel";

interface ChartViewerProps {
  worksheet: WorksheetData;
}

const CHART_COLORS = [
  "#1F77B4", "#FF7F0E", "#2CA02C", "#D62728",
  "#9467BD", "#8C564B", "#E377C2", "#7F7F7F", 
  "#BCBD22", "#17BECF"
];

const ChartViewer = ({ worksheet }: ChartViewerProps) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "bar",
    xAxis: "",
    yAxis: [],
    title: "Excel Data Visualization"
  });

  // Process data for charts
  const processedData = useMemo(() => {
    if (!chartConfig.xAxis || chartConfig.yAxis.length === 0) return [];

    return worksheet.data.map(row => {
      // Create entry with x-axis value
      const entry: Record<string, any> = {
        [chartConfig.xAxis]: row[chartConfig.xAxis].value
      };

      // Add all selected y-axis values
      chartConfig.yAxis.forEach(yAxis => {
        entry[yAxis] = typeof row[yAxis].value === 'number' 
          ? row[yAxis].value 
          : 0; // Default to 0 for non-numeric values
      });

      return entry;
    });
  }, [worksheet.data, chartConfig]);

  // For pie chart, we need different data structure
  const pieData = useMemo(() => {
    if (!chartConfig.xAxis || chartConfig.yAxis.length === 0) return [];
    
    // For pie chart, we only use the first selected y-axis
    const yAxis = chartConfig.yAxis[0];
    
    return worksheet.data.map(row => ({
      name: row[chartConfig.xAxis].value?.toString() || "Unknown",
      value: typeof row[yAxis].value === 'number' ? row[yAxis].value : 0
    }));
  }, [worksheet.data, chartConfig]);
  
  const handleChangeChartType = (type: ChartType) => {
    setChartConfig({ ...chartConfig, type });
  };

  const handleChangeXAxis = (value: string) => {
    setChartConfig({ ...chartConfig, xAxis: value });
  };

  const handleToggleYAxis = (header: string) => {
    let newYAxis = [...chartConfig.yAxis];
    
    if (newYAxis.includes(header)) {
      newYAxis = newYAxis.filter(y => y !== header);
    } else {
      newYAxis.push(header);
    }
    
    setChartConfig({ ...chartConfig, yAxis: newYAxis });
  };

  const renderChart = () => {
    if (!chartConfig.xAxis || chartConfig.yAxis.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md border border-dashed border-gray-300">
          <p className="text-gray-500">Select X and Y axes to display chart</p>
        </div>
      );
    }

    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis.map((axis, index) => (
                <Bar 
                  key={axis} 
                  dataKey={axis} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  animationDuration={1500}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis.map((axis, index) => (
                <Line 
                  key={axis} 
                  type="monotone" 
                  dataKey={axis} 
                  stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                  activeDot={{ r: 8 }}
                  animationDuration={1500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis.map((axis, index) => (
                <Area 
                  key={axis} 
                  type="monotone" 
                  dataKey={axis} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  fillOpacity={0.3}
                  animationDuration={1500}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1500}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chartConfig.xAxis} 
                name={chartConfig.xAxis} 
                type="number" 
              />
              <YAxis 
                dataKey={chartConfig.yAxis[0]} 
                name={chartConfig.yAxis[0]} 
                type="number" 
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter 
                name={`${chartConfig.xAxis} vs ${chartConfig.yAxis[0]}`} 
                data={processedData} 
                fill={CHART_COLORS[0]} 
                animationDuration={1500}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          <Input
            value={chartConfig.title}
            onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
            className="text-xl font-bold border-none px-0 focus-visible:ring-0"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
            <Select 
              value={chartConfig.type} 
              onValueChange={(value) => handleChangeChartType(value as ChartType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X Axis</label>
            <Select 
              value={chartConfig.xAxis} 
              onValueChange={handleChangeXAxis}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select X axis" />
              </SelectTrigger>
              <SelectContent>
                {worksheet.headers.map(header => (
                  <SelectItem key={header} value={header}>{header}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Y Axis (Data Series)</label>
          <div className="flex flex-wrap gap-2">
            {worksheet.headers.map(header => (
              <Button
                key={header}
                variant={chartConfig.yAxis.includes(header) ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleYAxis(header)}
              >
                {header}
              </Button>
            ))}
          </div>
          {chartConfig.type === "pie" && chartConfig.yAxis.length > 1 && (
            <p className="text-sm text-amber-600 mt-1">
              Note: Pie chart only uses the first selected Y-axis
            </p>
          )}
        </div>
        
        <div className="mt-6 border rounded-lg overflow-hidden">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartViewer;
