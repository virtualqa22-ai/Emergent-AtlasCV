import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { BadgeCheck, Upload, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ResumeChecker = ({ isAuthenticated, onAuthRequired }) => {
  const [resumeText, setResumeText] = useState('');
  const [ats, setAts] = useState({ score: 0, hints: [] });
  const [loading, setLoading] = useState(false);
  const [hasScored, setHasScored] = useState(false);

  const checkResume = async () => {
    if (!resumeText.trim()) return;
    
    setLoading(true);
    try {
      // Parse resume text into a basic structure for scoring
      const resumeData = parseResumeText(resumeText);
      
      // Create a temporary resume for scoring
      const { data: resume } = await axios.post(`${API}/resumes`, resumeData);
      
      // Get the score
      const { data: score } = await axios.post(`${API}/resumes/${resume.id}/score`);
      setAts(score);
      setHasScored(true);
      
      // Clean up - delete the temporary resume
      await axios.delete(`${API}/resumes/${resume.id}`).catch(() => {
        // Ignore deletion errors
      });
    } catch (error) {
      console.error('Resume check failed:', error);
      // Fallback to local scoring
      const localScore = calculateLocalScore(resumeText);
      setAts(localScore);
      setHasScored(true);
    } finally {
      setLoading(false);
    }
  };

  const parseResumeText = (text) => {
    // Basic parsing logic to extract information from resume text
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const resumeData = {
      locale: "US",
      contact: {
        full_name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        country: "United States",
        linkedin: "",
        website: ""
      },
      summary: "",
      skills: [],
      experience: [],
      education: [],
      projects: []
    };

    // Look for email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      resumeData.contact.email = emailMatch[0];
    }

    // Look for phone pattern
    const phoneRegex = /(\+?1?[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      resumeData.contact.phone = phoneMatch[0];
    }

    // Extract skills (look for common skill-related keywords)
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'node', 'aws', 'sql', 'html', 'css',
      'docker', 'kubernetes', 'git', 'agile', 'scrum', 'leadership', 'communication'
    ];
    
    skillKeywords.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        resumeData.skills.push(skill);
      }
    });

    // Set a basic summary from the first few meaningful lines
    const meaningfulLines = lines.filter(line => 
      line.length > 20 && 
      !emailRegex.test(line) && 
      !phoneRegex.test(line)
    );
    
    if (meaningfulLines.length > 0) {
      resumeData.summary = meaningfulLines.slice(0, 2).join(' ');
    }

    // Extract name (usually first line that's not contact info)
    for (const line of lines) {
      if (line.length > 3 && line.length < 50 && 
          !emailRegex.test(line) && 
          !phoneRegex.test(line) &&
          !/\d/.test(line)) {
        resumeData.contact.full_name = line;
        break;
      }
    }

    return resumeData;
  };

  const calculateLocalScore = (text) => {
    let score = 100;
    const hints = [];
    
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1?[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
    
    if (!emailRegex.test(text)) {
      hints.push("Add an email address for contact information.");
      score -= 20;
    }
    
    if (!phoneRegex.test(text)) {
      hints.push("Include a phone number for better reachability.");
      score -= 10;
    }
    
    if (text.length < 200) {
      hints.push("Resume content seems too short. Add more details about your experience.");
      score -= 25;
    }
    
    const skillKeywords = ['javascript', 'python', 'java', 'react', 'node', 'aws', 'sql'];
    const foundSkills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    
    if (foundSkills.length < 3) {
      hints.push("Add more relevant technical skills to improve keyword matching.");
      score -= 15;
    }
    
    if (!text.toLowerCase().includes('experience') && !text.toLowerCase().includes('work')) {
      hints.push("Include work experience section with job titles and descriptions.");
      score -= 20;
    }
    
    return { score: Math.max(0, score), hints };
  };

  const scoreColor = ats.score >= 80 ? "text-emerald-600" : ats.score >= 60 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Resume Checker</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get instant ATS compatibility scores and actionable feedback to improve your resume's performance
        </p>
      </div>

      {/* Input Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Paste Your Resume Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Copy and paste your resume text here. Include all sections: contact information, summary, experience, education, skills, etc."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={12}
              className="text-sm"
            />
            <p className="text-xs text-gray-500">
              Tip: Copy your resume text from Word, PDF, or LinkedIn to get the most accurate analysis
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={checkResume}
              disabled={loading || !resumeText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BadgeCheck className="h-4 w-4 mr-2" />
              {loading ? 'Analyzing...' : 'Check ATS Score'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setResumeText('');
                setAts({ score: 0, hints: [] });
                setHasScored(false);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasScored && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" />
              ATS Compatibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl font-bold mb-2">
                <span className={scoreColor}>{ats.score}</span>
                <span className="text-gray-400">/100</span>
              </div>
              <div className="text-lg font-medium text-gray-700 mb-4">ATS Compatibility Score</div>
              <Progress value={ats.score} className="h-3 w-full max-w-sm mx-auto" />
              <div className="mt-4 text-sm text-gray-600">
                {ats.score >= 80 ? (
                  <span className="text-emerald-600 font-medium">✓ Excellent - Your resume is ATS-optimized!</span>
                ) : ats.score >= 60 ? (
                  <span className="text-amber-600 font-medium">⚠ Good - Room for improvement</span>
                ) : (
                  <span className="text-rose-600 font-medium">✗ Needs Work - Several optimization opportunities</span>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {ats.hints.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recommendations for Improvement
                </h3>
                <ul className="space-y-2">
                  {ats.hints.map((hint, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700">{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ats.hints.length === 0 && (
              <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                <BadgeCheck className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">Great Job!</h3>
                <p className="text-green-700">Your resume looks well-optimized. Keep quantifying your impact and achievements.</p>
              </div>
            )}

            {/* Additional Tips */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General ATS Optimization Tips</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <ul className="space-y-2">
                  <li>• Use standard section headings (Experience, Education, Skills)</li>
                  <li>• Include relevant keywords from job descriptions</li>
                  <li>• Use a clean, simple format without images or graphics</li>
                  <li>• Quantify achievements with numbers and percentages</li>
                </ul>
                <ul className="space-y-2">
                  <li>• Save as .docx or .pdf format</li>
                  <li>• Avoid headers, footers, and text boxes</li>
                  <li>• Use standard fonts like Arial, Calibri, or Times New Roman</li>
                  <li>• Include both hard and soft skills</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};