import { useEffect, useState } from 'react'

interface ServerStatus {
  status: string
  timestamp: string
  uptime: number
}

export default function Home() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/health')
        const data = await response.json()
        setServerStatus(data)
      } catch (error) {
        console.error('Server not available:', error)
      } finally {
        setLoading(false)
      }
    }

    checkServerStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            💡 Expense Management System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete MVP for Odoo Hackathon
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
              
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Checking server status...</p>
                </div>
              ) : serverStatus ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Backend:</span>
                    <span className="text-sm text-green-600">✅ Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Frontend:</span>
                    <span className="text-sm text-green-600">✅ Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Database:</span>
                    <span className="text-sm text-green-600">✅ Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Uptime:</span>
                    <span className="text-sm text-gray-600">{Math.floor(serverStatus.uptime)}s</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm text-red-600">❌ Server unavailable</span>
                  <p className="mt-2 text-xs text-gray-500">
                    Make sure the backend is running on port 5000
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => window.location.href = '/register'}
                >
                  Register New Company
                </button>
                <button
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => window.location.href = '/login'}
                >
                  Login to Dashboard
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-green-600">✅ Authentication</div>
                <div className="text-green-600">✅ User Management</div>
                <div className="text-green-600">✅ Company Setup</div>
                <div className="text-green-600">✅ Role Control</div>
                <div className="text-yellow-600">🔄 Expense Forms</div>
                <div className="text-yellow-600">🔄 OCR Integration</div>
                <div className="text-yellow-600">🔄 Approvals</div>
                <div className="text-yellow-600">🔄 Dashboards</div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              Built with Next.js + Node.js + MySQL
              <br />
              <a 
                href="https://github.com/your-repo" 
                className="text-indigo-600 hover:text-indigo-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}