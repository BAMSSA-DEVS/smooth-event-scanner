import { api } from "@/lib/axios";
import { VALIDATE_ENDPOINT } from "@/lib/endpoints";

export interface ValidatePayload {
    event_id: number;
    scanner_key: string;
    access_code: string;
}

export interface ValidateResponse {
    status: boolean;
    statusCode: number;
    data: {
        info: {
            ticket_name: string;
            name: string;
            email: string;
        };
    };
}

export const validateTicket = async (payload: ValidatePayload): Promise<ValidateResponse> => {
    const { data } = await api.post<ValidateResponse>(VALIDATE_ENDPOINT, payload);
    return data;
};
