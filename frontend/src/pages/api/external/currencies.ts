import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, headers, query } = req;
    
    // Forward authorization header
    const forwardHeaders: any = {
      'Content-Type': 'application/json',
    };
    
    if (headers.authorization) {
      forwardHeaders.Authorization = headers.authorization;
    }

    // Construct backend URL
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const backendUrl = `${BACKEND_URL}/api/external/currencies${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Forwarding ${method} request to: ${backendUrl}`);

    // Forward request to backend
    const response = await axios({
      method: method as any,
      url: backendUrl,
      headers: forwardHeaders,
      ...(method !== 'GET' && method !== 'HEAD' && req.body ? { data: req.body } : {}),
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Currencies API proxy error:', error.message);
    
    if (error.response) {
      console.error('Backend error response:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: { message: 'Internal server error' } });
    }
  }
}