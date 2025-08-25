import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Search, Target, BarChart3, CheckCircle } from 'lucide-react';

export const JDVerification = ({ isAuthenticated, onAuthRequired }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">JD Verification</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Analyze job descriptions and optimize your application materials for specific roles
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="shadow-lg border-2 border-dashed border-gray-300">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-teal-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600 leading-relaxed">
            Our JD Verification tool is under development. It will help you analyze job postings 
            and ensure your resume and cover letter are perfectly aligned with employer requirements.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Analysis</h3>
              <p className="text-sm text-gray-600">Extract key requirements and qualifications</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Match Scoring</h3>
              <p className="text-sm text-gray-600">See how well your profile matches the role</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gap Analysis</h3>
              <p className="text-sm text-gray-600">Identify missing skills and keywords</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mt-8">
            <h4 className="font-semibold text-gray-900 mb-3">Planned Features:</h4>
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li>• Advanced job description parsing and analysis</li>
              <li>• Keyword extraction and importance ranking</li>
              <li>• Skills gap identification and recommendations</li>
              <li>• Resume optimization suggestions per job posting</li>
              <li>• Compatibility scoring with detailed breakdowns</li>
              <li>• Salary and market insights integration</li>
            </ul>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            Notify Me When Ready
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};