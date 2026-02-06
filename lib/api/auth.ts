import { api } from "@/lib/axios";
import { AUTH_ENDPOINT } from "@/lib/endpoints";

export interface AuthPayload {
    event_id: number;
    scanner_key: string;
}

export interface AuthResponse {
    status: boolean;
    statusCode: number;
    data: {
        event: {
            id: number;
            description: string;
            name: string;
            image: {
                id: string;
                link: string;
            };
            start_date: string;
            end_date: string;
            scanner_key: string;
        };
    };
}

export const authenticateScanner = async (payload: AuthPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(AUTH_ENDPOINT, payload);
    return data;
};
