'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TracePage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    serverId: '',
    toolId: '',
    limit: '50',
    offset: '0',
  });

  useEffect(() => {
    fetchExecutions();
  }, [filters]);

  const fetchExecutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.serverId) queryParams.append('serverId', filters.serverId);
      if (filters.toolId) queryParams.append('toolId', filters.toolId);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      
      const response = await fetch(`/api/v1/executions?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch executions: ${response.status}`);
      }
      const data = await response.json();
      setExecutions(data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching executions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      serverId: '',
      toolId: '',
      limit: '50',
      offset: '0',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Execution Trace Viewer</h1>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server ID</label>
              <input
                type="number"
                value={filters.serverId}
                onChange={(e) => setFilters({ ...filters, serverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tool ID</label>
              <input
                type="number"
                value={filters.toolId}
                onChange={(e) => setFilters({ ...filters, toolId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
              <input
                type="number"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300"
              >
                Reset
              </button>
              <button
                onClick={fetchExecutions}
                className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Loading/Error */}
        {loading && <div className="text-center py-8">Loading executions...</div>}
        {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">{error}</div>}

        {/* Executions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (ms)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Args</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {executions.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-center text-gray-500" colSpan="7">
                    No executions found
                  </td>
                </tr>
              ) : (
                executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(exec.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exec.serverName || `Server #${exec.serverId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exec.toolName || `Tool #${exec.toolId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {exec.status === 'succeeded' ? (
                        <span className="bg-green-100 text-green-800 px-2 inline-flex items-center leading-5 rounded-full">{exec.status}</span>
                      ) : exec.status === 'failed' ? (
                        <span className="bg-red-100 text-red-800 px-2 inline-flex items-center leading-5 rounded-full">{exec.status}</span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 px-2 inline-flex items-center leading-5 rounded-full">{exec.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exec.durationMs ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <pre className="text-xs">{JSON.stringify(exec.args, null, 2)}</pre>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exec.error ? (
                        <div className="text-red-600">
                          <strong>Error:</strong> {exec.error}
                        </div>
                      ) : exec.result ? (
                        <div>
                          <strong>Result:</strong> <pre className="text-xs">{JSON.stringify(exec.result, null, 2)}</pre>
                        </div>
                      ) : (
                        <span className="italic">No data</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {executions.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setFilters({ ...filters, offset: Math.max(0, Number(filters.offset) - Number(filters.limit)).toString() })}
              disabled={Number(filters.offset) === 0}
              className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300"
            >
              Previous Page
            </button>
            <span className="text-sm text-gray-600">
              Showing {executions.length} executions
            </span>
            <button
              onClick={() => setFilters({ ...filters, offset: (Number(filters.offset) + Number(filters.limit)).toString() })}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Next Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}