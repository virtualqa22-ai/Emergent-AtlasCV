import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MailOpen, FileText, Zap, Target } from 'lucide-react';

export const CoverLetterBuilder = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Cover Letter Builder</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create compelling cover letters that complement your resume and match job requirements
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="shadow-lg border-2 border-dashed border-gray-300">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailOpen className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600 leading-relaxed">
            Our Cover Letter Builder is currently in development. Soon you'll be able to create 
            professional, tailored cover letters that perfectly complement your resume.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Templates</h3>
              <p className="text-sm text-gray-600">Professional templates tailored to different industries</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">JD Integration</h3>
              <p className="text-sm text-gray-600">Automatically match content to job descriptions</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Assistance</h3>
              <p className="text-sm text-gray-600">Get suggestions for compelling content</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mt-8">
            <h4 className="font-semibold text-gray-900 mb-3">What to expect:</h4>
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li>• Industry-specific cover letter templates</li>
              <li>• Integration with your resume data</li>
              <li>• Job description keyword matching</li>
              <li>• Real-time suggestions and improvements</li>
              <li>• Export to PDF and Word formats</li>
            </ul>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            Check Back Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};