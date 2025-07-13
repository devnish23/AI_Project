import React from 'react';

const ApplicationDetail: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Application Details
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View and manage application information
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Application detail page - Coming soon
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail; 