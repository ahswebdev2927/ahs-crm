export type ApiSuccessResponse<T> = {
  status: true;
  statusCode: number;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  status: false;
  statusCode: number;
  message: string;
  data: null;
  devMessage?: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
};
