"use client";

import { FiMail, FiMessageCircle, FiHelpCircle } from 'react-icons/fi';

export default function HelpPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Help & Support</h1>
      
      {/* Contact Us Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiMessageCircle className="text-blue-600" />
          Contact Us
        </h2>
        <p className="text-gray-600 mb-4">
          Have questions, feedback, or need assistance? We'd love to hear from you!
        </p>
        
        <div className="space-y-4">
          {/* General Support Email */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <FiMail className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-gray-900">General Support</p>
              <a 
                href="mailto:identify.ink@gmail.com"
                className="text-blue-600 hover:underline"
              >
                identify.ink@gmail.com
              </a>
              <p className="text-sm text-gray-500 mt-1">
                For general inquiries, bug reports, and feature requests
              </p>
            </div>
          </div>
          
          {/* Founder Contact */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <FiMail className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-gray-900">Founder</p>
              <a 
                href="mailto:nejana24@gmail.com"
                className="text-blue-600 hover:underline"
              >
                nejana24@gmail.com
              </a>
              <p className="text-sm text-gray-500 mt-1">
                For partnerships, press, and business inquiries
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiHelpCircle className="text-blue-600" />
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-900 mb-2">What is Identify?</h3>
            <p className="text-gray-600 text-sm">
              Identify is a platform that lets you discover and curate creators you love. 
              Create boards, pin your favorite creators, and share your collections with others.
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-900 mb-2">How do I create a board?</h3>
            <p className="text-gray-600 text-sm">
              Go to the Boards page from your dashboard or navigation menu, then click 
              "Create Board". Give your board a name and description, and start pinning creators!
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-900 mb-2">How do I pin a creator?</h3>
            <p className="text-gray-600 text-sm">
              When viewing a creator's profile or browsing the Explore page, click the 
              "Pin" button. You can then choose which board to add them to.
            </p>
          </div>
          
          <div className="pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Is Identify free to use?</h3>
            <p className="text-gray-600 text-sm">
              Yes! Identify is completely free. Create an account and start discovering 
              and curating creators today.
            </p>
          </div>
        </div>
      </div>
      
      {/* Response Time Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Response Time:</strong> We typically respond to emails within 24-48 hours. 
          Thank you for your patience!
        </p>
      </div>
    </div>
  );
}
