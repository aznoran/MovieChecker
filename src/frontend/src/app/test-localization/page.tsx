'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function TestLocalizationPage() {
  const [allErrors, setAllErrors] = useState<any>(null);
  const [testKey, setTestKey] = useState('InsufficientPermissionsCreate');
  const [testResult, setTestResult] = useState<any>(null);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllErrors = async (lang: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/test-localization/all-errors', {
        headers: {
          'Accept-Language': lang
        }
      });
      setAllErrors(response.data);
    } catch (error: any) {
      console.error('Error fetching errors:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch translations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestError = async (key: string, lang: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/test-localization/test-error/${key}`, {
        headers: {
          'Accept-Language': lang
        }
      });
      setTestResult(response.data);
    } catch (error: any) {
      console.error('Error fetching test error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch translation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllErrors(language);
  }, [language]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Localization Test Page</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block mb-2 font-semibold">Language:</label>
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-2 rounded"
          disabled={loading}
        >
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
        {loading && <span className="ml-4 text-gray-600">Loading...</span>}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">All Error Messages</h2>
        {loading && !allErrors && <p>Loading...</p>}
        {allErrors && (
          <div className="border p-4 rounded">
            <p className="mb-2"><strong>Culture:</strong> {allErrors.culture}</p>
            <p className="mb-4"><strong>UI Culture:</strong> {allErrors.uiCulture}</p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Key</th>
                  <th className="border p-2 text-left">Translated Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(allErrors.errors).map(([key, value]) => (
                  <tr key={key}>
                    <td className="border p-2 font-mono text-sm">{key}</td>
                    <td className="border p-2">{value as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Test Single Error Key</h2>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Error Key:</label>
          <input
            type="text"
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
            className="border p-2 rounded w-full"
            placeholder="Enter error key"
          />
        </div>
        <button
          onClick={() => fetchTestError(testKey, language)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          Test Key
        </button>
        {testResult && (
          <div className="mt-4 border p-4 rounded">
            <p><strong>Key:</strong> {testResult.key}</p>
            <p><strong>Translated Value:</strong> {testResult.translatedValue}</p>
            <p><strong>Is Found:</strong> {testResult.isFound ? 'Yes' : 'No'}</p>
            <p><strong>Culture:</strong> {testResult.culture}</p>
            <p><strong>UI Culture:</strong> {testResult.uiCulture}</p>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-gray-600">
          This page tests the localization system by making direct API calls to test endpoints.
          The backend uses IStringLocalizer to translate error keys to messages based on the Accept-Language header.
        </p>
      </div>
    </div>
  );
}
