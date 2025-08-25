import React from 'react';
import { AuthForms } from '../auth/AuthForms';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  FileText, 
  BadgeCheck, 
  MailOpen, 
  Search, 
  Shield, 
  Globe, 
  Zap,
  Target,
  Users,
  Award
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_aa15cf1d-5e8b-4d06-9ed0-e8d4185d0366/artifacts/r6oihf5r_AtlasCV_Logo_Transparent.png";

export const LandingPage = () => {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "Resume Builder",
      description: "Create ATS-optimized resumes with guided templates and real-time scoring. Built for modern job applications."
    },
    {
      icon: <BadgeCheck className="h-8 w-8 text-teal-600" />,
      title: "Resume Checker",
      description: "Get instant ATS compatibility scores and actionable feedback to improve your resume's chances."
    },
    {
      icon: <MailOpen className="h-8 w-8 text-blue-600" />,
      title: "Cover Letter Builder",
      description: "Craft compelling cover letters that complement your resume and match job descriptions."
    },
    {
      icon: <Search className="h-8 w-8 text-teal-600" />,
      title: "JD Verification",
      description: "Analyze job descriptions and optimize your application materials for specific roles."
    }
  ];

  const benefits = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "ATS-Optimized",
      description: "Built specifically to pass Applicant Tracking Systems"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Country-Specific",
      description: "Formats for US, EU, AU, JP, IN, CA, SG, AE and more"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy-First", 
      description: "Your data is encrypted and secure with local-only options"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Live Preview",
      description: "See changes instantly with real-time resume preview"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Expert Templates",
      description: "Professional templates designed by career experts"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Proven Results",
      description: "Higher interview rates with ATS-optimized resumes"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="AtlasCV" className="h-8 w-8" />
              <span className="font-bold text-xl" style={{ color: '#1D4ED8' }}>AtlasCV</span>
              <span className="text-sm font-medium" style={{ color: '#16A34A' }}>
                ATS-Optimized Resume Builder
              </span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden bg-gradient-to-br from-blue-50 to-teal-50">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231D4ED8' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Hero Content */}
              <div className="space-y-8 animate-fade-in-up">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight animate-slide-in-left">
                    Build Your
                    <span className="block animate-bounce-in" style={{ color: '#1D4ED8' }}>
                      ATS-Optimized
                    </span>
                    <span className="block animate-bounce-in-delay" style={{ color: '#16A34A' }}>
                      Resume
                    </span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed animate-fade-in-delay">
                    Create professional resumes that pass Applicant Tracking Systems and land you more interviews. 
                    Built with country-specific formats and real-time ATS scoring.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 animate-fade-in-delay">
                  <div className="flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-float">
                    <BadgeCheck className="h-5 w-5 text-teal-600" />
                    <span className="text-sm font-medium">ATS-Optimized</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-float-delay">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">9 Countries Supported</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-float-delay-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Privacy-First</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 pt-8 animate-slide-up">
                  <div className="text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold animate-counter" style={{ color: '#1D4ED8' }}>98%</div>
                    <div className="text-sm text-gray-600">ATS Pass Rate</div>
                  </div>
                  <div className="text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold animate-counter-delay" style={{ color: '#16A34A' }}>9</div>
                    <div className="text-sm text-gray-600">Country Formats</div>
                  </div>
                  <div className="text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold animate-counter-delay-2" style={{ color: '#1D4ED8' }}>3x</div>
                    <div className="text-sm text-gray-600">More Interviews</div>
                  </div>
                </div>
              </div>

              {/* Right Column - Hero Image + Auth Forms */}
              <div className="lg:pl-8 space-y-8">
                {/* Hero Image */}
                <div className="relative animate-slide-in-right">
                  <img 
                    src="https://images.unsplash.com/photo-1658203897415-3cad6cfad5c0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxkb2N1bWVudCUyMGVkaXRpbmd8ZW58MHx8fGJsdWV8MTc1NjEyMDcxMXww&ixlib=rb-4.1.0&q=85"
                    alt="Resume Builder - Document Editing Tool"
                    className="w-full h-64 object-cover rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-teal-600/20 rounded-2xl"></div>
                </div>
                
                {/* Auth Forms */}
                <div className="animate-fade-in-delay">
                  <AuthForms />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Comprehensive Career Tools
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need to create, optimize, and succeed with your job applications
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1 group animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="text-center pb-3">
                    <div className="flex justify-center mb-4 group-hover:animate-bounce">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Technology Showcase Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Technology Image */}
              <div className="animate-slide-in-left">
                <img 
                  src="https://images.unsplash.com/photo-1562564055-71e051d33c19?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwyfHxkb2N1bWVudCUyMG1hbmFnZW1lbnR8ZW58MHx8fHwxNzU2MTIwNzc1fDA&ixlib=rb-4.1.0&q=85"
                  alt="Professional Document Management & ATS Processing"
                  className="w-full h-80 object-cover rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                />
              </div>
              
              {/* Right Column - Content */}
              <div className="space-y-6 animate-slide-in-right">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Advanced ATS Technology
                </h2>
                <p className="text-xl leading-relaxed opacity-90">
                  Our AI-powered system analyzes your resume against real ATS algorithms, 
                  ensuring maximum compatibility with hiring systems used by top companies.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></div>
                    <span className="text-lg">Real-time ATS scoring and optimization</span>
                  </div>
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></div>
                    <span className="text-lg">Keyword analysis and recommendations</span>
                  </div>
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></div>
                    <span className="text-lg">Format compatibility verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resume Templates Showcase */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Professional Resume Templates
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose from our collection of ATS-optimized templates designed by career experts
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Template Image */}
              <div className="animate-slide-in-left">
                <img 
                  src="https://images.unsplash.com/photo-1587287720754-94bac45f0bff?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxyZXN1bWUlMjB0ZW1wbGF0ZXxlbnwwfHx8fDE3NTYxMjA3Njl8MA&ixlib=rb-4.1.0&q=85"
                  alt="Professional Resume Templates & CV Formats"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                />
              </div>
              
              {/* Right Column - Template Features */}
              <div className="space-y-6 animate-slide-in-right">
                <h3 className="text-2xl font-bold text-gray-900">
                  Multiple Template Styles
                </h3>
                <p className="text-lg text-gray-600">
                  Our templates are designed to pass ATS systems while maintaining visual appeal. 
                  Each template is optimized for different industries and career levels.
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded"></div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Modern</p>
                  </div>
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <div className="w-8 h-8 bg-teal-600 rounded"></div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Classic</p>
                  </div>
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <div className="w-8 h-8 bg-gray-600 rounded"></div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Minimal</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <BadgeCheck className="h-5 w-5 text-teal-600" />
                    <span className="text-gray-700">ATS-friendly formatting guaranteed</span>
                  </div>
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Country-specific layout options</span>
                  </div>
                  <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <Award className="h-5 w-5 text-yellow-600" />
                    <span className="text-gray-700">Industry-optimized designs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Why Choose AtlasCV?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Built by career experts with proven strategies for job search success
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4 p-6 bg-white/90 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                  <div 
                    className="flex-shrink-0 p-2 rounded-md animate-pulse"
                    style={{ backgroundColor: '#F0F9FF', color: '#1D4ED8' }}
                  >
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-sm text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <section className="py-20 bg-gradient-to-br from-teal-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Success Image */}
              <div className="animate-slide-in-left">
                <img 
                  src="https://images.unsplash.com/photo-1659355893430-1b4c1e5b3201?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxqb2IlMjBhcHBsaWNhdGlvbnxlbnwwfHx8Ymx1ZXwxNzU2MTIwNzI1fDA&ixlib=rb-4.1.0&q=85"
                  alt="Professional Presenting Resume - Job Application Success"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                />
              </div>
              
              {/* Right Column - Testimonials */}
              <div className="space-y-8 animate-slide-in-right">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                  Success Stories
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-white/90 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        S
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Sarah Chen</h4>
                        <p className="text-sm text-gray-600">Software Engineer at Google</p>
                      </div>
                    </div>
                    <p className="text-gray-700 italic">
                      "AtlasCV helped me land my dream job at Google! The ATS optimization was incredible - I went from 0 responses to 5 interviews in just 2 weeks."
                    </p>
                  </div>
                  
                  <div className="bg-white/90 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        M
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Michael Rodriguez</h4>
                        <p className="text-sm text-gray-600">Marketing Director at Tesla</p>
                      </div>
                    </div>
                    <p className="text-gray-700 italic">
                      "The country-specific formats were a game-changer. Moving from Mexico to the US, AtlasCV made sure my resume met American standards perfectly."
                    </p>
                  </div>
                  
                  <div className="bg-white/90 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        A
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Aisha Patel</h4>
                        <p className="text-sm text-gray-600">Data Scientist at Microsoft</p>
                      </div>
                    </div>
                    <p className="text-gray-700 italic">
                      "The real-time ATS scoring feature saved me hours. I could see exactly what needed to be improved and my resume score went from 65% to 94%!"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 relative overflow-hidden">
          {/* Background Animation */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.4'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-fade-in-up">
              Ready to Build Your Perfect Resume?
            </h2>
            <p className="text-xl text-blue-100 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Join thousands of professionals who've landed their dream jobs with AtlasCV
            </p>
            <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <AuthForms />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="AtlasCV" className="h-8 w-8" />
                <span className="font-bold text-xl">AtlasCV</span>
              </div>
              <p className="text-gray-400 mb-4">
                The most advanced ATS-optimized resume builder with country-specific formats and real-time scoring.
              </p>
              <div className="text-sm text-gray-500">
                © {new Date().getFullYear()} AtlasCV. All rights reserved.
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Resume Builder</li>
                <li>ATS Checker</li>
                <li>Cover Letters</li>
                <li>JD Analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
                <li>GDPR Compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};