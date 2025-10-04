import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query, body, headers } = req;
    
    // Forward the authorization header
    const forwardHeaders: any = {
      'Content-Type': 'application/json',
    };
    
    if (headers.authorization) {
      forwardHeaders.Authorization = headers.authorization;
    }

    let url = `${BACKEND_URL}/api/approvals`;
    
    // Add query parameters if they exist
    if (Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else if (value) {
          params.append(key, value);
        }
      });
      url += `?${params.toString()}`;
    }

    const config: any = {
      method,
      url,
      headers: forwardHeaders,
      timeout: 10000,
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      config.data = body;
    }

    console.log(`Forwarding ${method} request to: ${url}`);
    
    const response = await axios(config);

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Approvals API proxy error:', error.message);
    
    if (error.response) {
      // Backend responded with an error
      console.log('Backend error response:', error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Network error - couldn't reach backend
      console.error('Network error - cannot reach backend');
      return res.status(503).json({ 
        error: { 
          message: 'Cannot connect to backend service' 
        } 
      });
    } else {
      // Other error
      console.error('Unknown error:', error);
      return res.status(500).json({ 
        error: { 
          message: 'Internal server error during approvals operation' 
        } 
      });
    }
  }
}