export interface GeminiResponse {
  [category: string]: {
    subtask: string;
    start_date: string;
    end_date: string;
    steps: string[];
  }[];
}
