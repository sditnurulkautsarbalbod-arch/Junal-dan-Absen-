
// PENTING: Gunakan VITE_GOOGLE_SCRIPT_URL di environment variables Vercel
// Fix: Accessing env on import.meta requires casting to any if Vite client types are not loaded in the current TS context.
const GOOGLE_SCRIPT_URL = (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxha17-5wId8MEVF9Liye3G33eCICuVXpcTn_GNTWhcp_z_SFS94DOwZv3jQgB4NYbC/exec";

export interface SyncDataResponse {
  users: any[];
  classes: any[];
  students: any[];
  journals: any[];
  attendance: any[];
  settings: any[];
}

export interface ApiRequest {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'users' | 'classes' | 'students' | 'journals' | 'attendance' | 'settings';
  data: any;
}

export const fetchAllFromSheet = async (): Promise<SyncDataResponse> => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from Google Sheet", error);
    throw error;
  }
};

export const sendToSheet = async (req: ApiRequest): Promise<boolean> => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      redirect: 'follow' 
    });

    const textResult = await response.text();

    try {
        const result = JSON.parse(textResult);
        
        if (result.status === 'success') {
            return true;
        } 
        
        const msg = result.message || '';

        if (msg.includes("ID not found")) {
            if (req.action === 'DELETE') return true;
            if (req.action === 'UPDATE') {
                const createReq = { ...req, action: 'CREATE' as const };
                try {
                    const retryResponse = await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(createReq),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        redirect: 'follow'
                    });
                    const retryText = await retryResponse.text();
                    const retryResult = JSON.parse(retryText);
                    return retryResult.status === 'success';
                } catch (retryErr) {
                    return false;
                }
            }
        }
        return false;
    } catch (e) {
        return false;
    }
  } catch (error) {
    return false;
  }
};
