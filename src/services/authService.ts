import api from "../api/axios";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    token: string;
    mustChangePassword: boolean; 
    user: {
      id: number;
      username: string;
      fullName: string;
      role: string;
    };
  };
  timestamps: string;
}
interface LoginResult {
  token: string;
  mustChangePassword: boolean;
}

export const login = async (data: LoginRequest): Promise<LoginResult> => { 
  try {
    const response = await api.post<LoginResponse>("/auths/login", data);
    console.log("login User: ",response);
    return {
      token: response.data.payload.token,
      mustChangePassword: response.data.payload.mustChangePassword ?? false,
    };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Login failed. Please try again.';
    throw new Error(message);
  }
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> => {
  await api.post('/auths/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  });
};
