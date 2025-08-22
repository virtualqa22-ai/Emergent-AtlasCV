import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Mail, Phone, Globe, Linkedin } from 'lucide-react';

const ResumePreview = ({ resumeData, template = 'modern', className = '' }) => {
  const templates = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
  };

  const TemplateComponent = templates[template] || templates.modern;

  return (
    <div className={`resume-preview ${className}`}>
      <TemplateComponent data={resumeData} />
    </div>
  );
};

// Modern Template - Clean with subtle colors
const ModernTemplate = ({ data }) => {
  return (
    <div className="bg-white p-8 shadow-lg max-w-[8.5in] mx-auto font-sans text-gray-800 leading-relaxed">
      {/* Header */}
      <header className="border-b-2 border-blue-600 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {data?.contact?.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{data.contact.email}</span>
            </div>
          )}
          {data?.contact?.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{data.contact.phone}</span>
            </div>
          )}
          {(data?.contact?.city || data?.contact?.state) && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{[data.contact.city, data.contact.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {data?.contact?.linkedin && (
            <div className="flex items-center gap-1">
              <Linkedin className="h-4 w-4" />
              <span>{data.contact.linkedin}</span>
            </div>
          )}
          {data?.contact?.website && (
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>{data.contact.website}</span>
            </div>
          )}
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Skills */}
      {data?.skills?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {data?.experience?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Professional Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{exp.title}</h3>
                  <p className="text-base font-medium text-gray-700">{exp.company}</p>
                </div>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {exp.start_date} - {exp.end_date || 'Present'}
                </span>
              </div>
              {exp.bullets?.length > 0 ? (
                <ul className="text-gray-700 ml-2 list-disc list-inside">
                  {exp.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx} className="mb-1">{bullet}</li>
                  ))}
                </ul>
              ) : exp.description && (
                <div className="text-gray-700 ml-2">
                  {exp.description.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx} className="mb-1">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {data?.projects?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                {project.link && (
                  <a href={project.link} className="text-sm text-blue-600 hover:underline">
                    View Project
                  </a>
                )}
              </div>
              {project.tech?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {project.tech.map((tech, techIdx) => (
                    <Badge key={techIdx} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}
              {project.description && (
                <p className="text-gray-700 ml-2">{project.description}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data?.education?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
                  <p className="text-base font-medium text-gray-700">{edu.institution}</p>
                  {edu.details && <p className="text-gray-600 text-sm mt-1">{edu.details}</p>}
                </div>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {edu.start_date} - {edu.end_date || 'Present'}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: Certifications */}
      {data?.certifications?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Certifications
          </h2>
          {data.certifications.map((cert, idx) => (
            <div key={cert.id || idx} className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{cert.name}</h3>
                  <p className="text-base font-medium text-gray-700">{cert.issuer}</p>
                  {cert.credential_id && (
                    <p className="text-sm text-gray-600">ID: {cert.credential_id}</p>
                  )}
                </div>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {cert.issue_date}
                  {cert.expiry_date && ` - ${cert.expiry_date}`}
                </span>
              </div>
              {cert.credential_url && (
                <a href={cert.credential_url} className="text-blue-600 hover:underline text-sm">
                  View Credential
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: References */}
      {data?.references?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            References
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.references.map((ref, idx) => (
              <div key={ref.id || idx} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900">{ref.name}</h3>
                <p className="text-gray-700">{ref.title}</p>
                <p className="text-gray-600">{ref.company}</p>
                {ref.email && <p className="text-sm text-gray-600">{ref.email}</p>}
                {ref.phone && <p className="text-sm text-gray-600">{ref.phone}</p>}
                {ref.relationship && (
                  <p className="text-xs text-gray-500 mt-1">Relationship: {ref.relationship}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phase 9: Personal Details */}
      {data?.personal_details && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Personal Details
          </h2>
          <div className="space-y-3">
            {data.personal_details.nationality && (
              <div><span className="font-medium">Nationality:</span> {data.personal_details.nationality}</div>
            )}
            {data.personal_details.visa_status && (
              <div><span className="font-medium">Visa Status:</span> {data.personal_details.visa_status}</div>
            )}
            {data.personal_details.languages?.length > 0 && (
              <div>
                <span className="font-medium">Languages:</span> {data.personal_details.languages.join(', ')}
              </div>
            )}
            {data.personal_details.hobbies?.length > 0 && (
              <div>
                <span className="font-medium">Interests:</span> {data.personal_details.hobbies.join(', ')}
              </div>
            )}
            {data.personal_details.volunteer_work && (
              <div>
                <span className="font-medium">Volunteer Work:</span> 
                <p className="mt-1 text-gray-700">{data.personal_details.volunteer_work}</p>
              </div>
            )}
            {data.personal_details.awards?.length > 0 && (
              <div>
                <span className="font-medium">Awards:</span> {data.personal_details.awards.join(', ')}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

// Classic Template - Traditional and professional
const ClassicTemplate = ({ data }) => {
  return (
    <div className="bg-white p-8 shadow-lg max-w-[8.5in] mx-auto font-serif text-gray-900 leading-relaxed">
      {/* Header */}
      <header className="text-center border-b border-gray-400 pb-6 mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="text-sm space-y-1">
          {data?.contact?.email && <div>{data.contact.email}</div>}
          {data?.contact?.phone && <div>{data.contact.phone}</div>}
          {(data?.contact?.city || data?.contact?.state) && (
            <div>{[data.contact.city, data.contact.state].filter(Boolean).join(', ')}</div>
          )}
          {data?.contact?.linkedin && <div>{data.contact.linkedin}</div>}
          {data?.contact?.website && <div>{data.contact.website}</div>}
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-3 text-center">
            Professional Summary
          </h2>
          <p className="text-justify">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data?.experience?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Professional Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="mb-6">
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-2">
                <div>
                  <h3 className="text-base font-bold">{exp.position}</h3>
                  <p className="font-semibold">{exp.company}</p>
                </div>
                <span className="text-sm italic">
                  {exp.start_date} - {exp.end_date || 'Present'}
                </span>
              </div>
              {exp.description && (
                <div className="text-justify">
                  {exp.description.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx} className="mb-1">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data?.education?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-4">
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-2">
                <div>
                  <h3 className="text-base font-bold">{edu.degree}</h3>
                  <p className="font-semibold">{edu.institution}</p>
                </div>
                <span className="text-sm italic">
                  {edu.start_date} - {edu.end_date || 'Present'}
                </span>
              </div>
              {edu.details && <p className="text-sm">{edu.details}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data?.skills?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-3 text-center">
            Skills
          </h2>
          <p className="text-center">{data.skills.join(' • ')}</p>
        </section>
      )}

      {/* Projects */}
      {data?.projects?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-4">
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-2">
                <h3 className="text-base font-bold">{project.name}</h3>
                {project.link && (
                  <span className="text-sm italic text-blue-700">{project.link}</span>
                )}
              </div>
              {project.tech?.length > 0 && (
                <p className="text-sm font-semibold mb-1">
                  Technologies: {project.tech.join(', ')}
                </p>
              )}
              {project.description && (
                <p className="text-justify text-sm">{project.description}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

// Minimal Template - Clean and simple
const MinimalTemplate = ({ data }) => {
  return (
    <div className="bg-white p-8 shadow-lg max-w-[8.5in] mx-auto font-sans text-gray-800 leading-relaxed">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-light text-gray-900 mb-6">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
          {data?.contact?.email && <div>{data.contact.email}</div>}
          {data?.contact?.phone && <div>{data.contact.phone}</div>}
          {(data?.contact?.city || data?.contact?.state) && (
            <div>{[data.contact.city, data.contact.state].filter(Boolean).join(', ')}</div>
          )}
          {data?.contact?.linkedin && <div>{data.contact.linkedin}</div>}
          {data?.contact?.website && <div>{data.contact.website}</div>}
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-12">
          <p className="text-gray-700 leading-relaxed text-lg">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data?.experience?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">
            Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="mb-8">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-xl font-light text-gray-900">{exp.position}</h3>
                <span className="text-sm text-gray-500">
                  {exp.start_date} - {exp.end_date || 'Present'}
                </span>
              </div>
              <p className="text-base text-gray-700 mb-3">{exp.company}</p>
              {exp.description && (
                <div className="text-gray-600">
                  {exp.description.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx} className="mb-1">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data?.education?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-xl font-light text-gray-900">{edu.degree}</h3>
                <span className="text-sm text-gray-500">
                  {edu.start_date} - {edu.end_date || 'Present'}
                </span>
              </div>
              <p className="text-base text-gray-700 mb-2">{edu.institution}</p>
              {edu.details && <p className="text-gray-600 text-sm">{edu.details}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {data?.projects?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">
            Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-xl font-light text-gray-900">{project.name}</h3>
                {project.link && (
                  <span className="text-sm text-gray-500">{project.link}</span>
                )}
              </div>
              {project.tech?.length > 0 && (
                <p className="text-sm text-gray-600 mb-2">{project.tech.join(' • ')}</p>
              )}
              {project.description && (
                <p className="text-gray-600">{project.description}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data?.skills?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">
            Skills
          </h2>
          <p className="text-gray-700">{data.skills.join(' • ')}</p>
        </section>
      )}
    </div>
  );
};

export default ResumePreview;