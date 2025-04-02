
export interface CellValue {
  value: string | number | boolean | Date | null;
  formatted?: string;
}

export interface WorksheetData {
  name: string;
  fileName: string;
  headers: string[];
  data: Record<string, CellValue>[];
  rawData: any[][];
}

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartConfig {
  type: ChartType;
  xAxis: string;
  yAxis: string[];
  title: string;
}
