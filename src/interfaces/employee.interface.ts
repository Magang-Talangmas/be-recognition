export interface EmployeeResponseItem {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  status: 'Active' | 'Inactive';
  faceRegistered: boolean;
  joinedAt: string | null;
  photos: string[];
}

export interface PaginatedEmployeeResponse {
  items: EmployeeResponseItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}