"use client";
import { useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import dynamic from 'next/dynamic';

function AddColumnPage() {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  
  const handleAddColumn = async () => {
    setStatus('Adding onboarded_at column to users table...');
    setError('');
    setSuccess(false);
    
    try {
      // Run raw SQL to add the column
      const { error } = await supabase.rpc('exec', { 
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE;' 
      });
      
      if (error) {
        console.error('Error adding column:', error);
        setError(error.message);
        setStatus('Failed to add column.');
      } else {
        setStatus('Column added successfully!');
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Failed to add column.');
    }
  };
  
  return (
    <div className="max-w-lg mx-auto mt-20 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Add onboarded_at Column</h1>
      <p className="mb-6 text-gray-600">
        This utility will add the <code className="bg-gray-100 px-1 py-0.5 rounded">onboarded_at</code> column 
        to the users table if it doesn't exist.
      </p>
      
      <button 
        onClick={handleAddColumn}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        Add Column
      </button>
      
      {status && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="font-medium">Status:</p>
          <p>{status}</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-100">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded border border-green-100">
          <p className="font-medium">Success!</p>
          <p>The column was added successfully. You can now proceed with onboarding.</p>
          <p className="mt-2">
            <a href="/auth/onboarding" className="text-blue-600 hover:underline">
              Continue to onboarding →
            </a>
          </p>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Manual Alternative:</h2>
        <p className="text-gray-600 text-sm">
          If this utility doesn't work, you can run the following SQL in your Supabase SQL Editor:
        </p>
        <pre className="mt-2 p-3 bg-gray-800 text-white rounded text-sm overflow-x-auto">
          ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE;
        </pre>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AddColumnPage), { ssr: false });
