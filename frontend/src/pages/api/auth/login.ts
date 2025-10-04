import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    console.log('Login request received:', JSON.stringify(req.body, null, 2));
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    console.log('Using backend URL:', backendUrl);
    
    const response = await axios.post(`${backendUrl}/api/auth/login`, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('Backend login response status:', response.status);
    console.log('Backend login response data:', JSON.stringify(response.data, null, 2));

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Login proxy error:', error.message);
    
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
          message: 'Internal server error during login' 
        } 
      });
    }
  }
}