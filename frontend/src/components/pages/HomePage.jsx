import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  FileText, 
  BadgeCheck, 
  MailOpen, 
  Search, 
  ArrowRight,
  Star,
  Zap,
  Shield
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_1b7521f8-be31-4252-9395-810ffabcc26c/artifacts/mzp3spuj_AtlasCV_Logo_FullColor.png";

export const HomePage = ({ onSelectTool, isAuthenticated }) => {
  const tools = [
    {
      id: 'resume-builder',
      name: 'Resume Builder',
      icon: <FileText className="h-12 w-12 text-blue-600" />,
      description: 'Create ATS-optimized resumes with guided templates and real-time scoring',
      features: ['Multiple Templates', 'Live Preview', 'ATS Scoring', 'Export Options'],
      color: 'from-blue-600 to-blue-700',
      popular: true
    },
    {
      id: 'resume-checker',
      name: 'Resume Checker', 
      icon: <BadgeCheck className="h-12 w-12 text-teal-600" />,
      description: 'Get instant ATS compatibility scores and actionable feedback',
      features: ['ATS Analysis', 'Instant Scoring', 'Improvement Tips', 'Format Check'],
      color: 'from-teal-600 to-teal-700'
    },
    {
      id: 'cover-letter',
      name: 'Cover Letter Builder',
      icon: <MailOpen className="h-12 w-12 text-purple-600" />,
      description: 'Craft compelling cover letters that match job descriptions',
      features: ['Template Library', 'JD Matching', 'Personal Branding', 'Export Ready'],
      color: 'from-purple-600 to-purple-700'
    },
    {
      id: 'jd-verification',
      name: 'JD Verification',
      icon: <Search className="h-12 w-12 text-orange-600" />,
      description: 'Analyze job descriptions and optimize your application materials',
      features: ['Keyword Analysis', 'Requirements Check', 'Skills Matching', 'Optimization'],
      color: 'from-orange-600 to-orange-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img 
                src={LOGO_URL} 
                alt="AtlasCV" 
                className="h-20 w-20 sm:h-24 sm:w-24"
              />
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
              Welcome to <span className="text-teal-300">AtlasCV</span>
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Your complete toolkit for creating ATS-optimized resumes and landing your dream job
            </p>
            
            {/* User Status */}
            <div className="mb-8">
              {isAuthenticated ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Signed in - Your data is saved</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Get started instantly - No signup required</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Tool
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the tool that best fits your needs. All tools work seamlessly together to help you land your next opportunity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tools.map((tool) => (
            <Card 
              key={tool.id} 
              className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm overflow-hidden relative"
            >
              {tool.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-medium">
                    <Star className="h-3 w-3" />
                    Popular
                  </div>
                </div>
              )}
              
              <div className={`h-2 bg-gradient-to-r ${tool.color}`}></div>
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-white transition-colors">
                      {tool.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {tool.name}
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {tool.description}
                </p>

                {/* Features */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    {tool.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => onSelectTool(tool.id)}
                  className={`w-full bg-gradient-to-r ${tool.color} hover:opacity-90 text-white border-0 h-12 text-base font-medium group-hover:shadow-lg transition-all`}
                >
                  <span>Start {tool.name}</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {isAuthenticated ? "Your Account Benefits" : "No Account? No Problem!"}
            </h3>
            {isAuthenticated ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Secure Storage</p>
                  <p className="text-sm text-gray-600">Your data is safely stored</p>
                </div>
                <div>
                  <Zap className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Import/Export</p>
                  <p className="text-sm text-gray-600">Full backup and sharing</p>
                </div>
                <div>
                  <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Premium Features</p>
                  <p className="text-sm text-gray-600">Advanced functionality</p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-700 mb-4">
                  Start building your resume immediately - no signup required! 
                </p>
                <p className="text-gray-600">
                  When you're ready to save or export your work, we'll help you create an account to preserve your data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};