import React from 'react';

const ResumePreview = ({ data, template = 'modern' }) => {
  if (!data) return <div className="p-8 text-center text-gray-500">Loading resume preview...</div>;

  const templates = {
    modern: <ModernTemplate data={data} />,
    classic: <ClassicTemplate data={data} />,
    minimal: <MinimalTemplate data={data} />
  };

  return (
    <div className="bg-white print-resume">
      {templates[template] || templates.modern}
    </div>
  );
};

// Modern Template - Clean with color accents
const ModernTemplate = ({ data }) => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-gray-800 leading-relaxed">
      {/* Header */}
      <header className="text-center mb-8 pb-6 border-b-2 border-blue-500">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="text-gray-600 space-y-1">
          {data?.contact?.email && (
            <div className="flex items-center justify-center gap-2">
              <span>📧</span>
              <span>{data.contact.email}</span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {data?.contact?.phone && <span>📱 {data.contact.phone}</span>}
            {data?.contact?.city && data?.contact?.state && (
              <span>📍 {data.contact.city}, {data.contact.state}</span>
            )}
            {data?.contact?.linkedin && (
              <a href={data.contact.linkedin} className="text-blue-600 hover:underline">
                🔗 LinkedIn
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Skills */}
      {data?.skills?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, idx) => (
              <span
                key={idx}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
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
            Key Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                {project.link && (
                  <a href={project.link} className="text-blue-600 hover:underline text-sm">
                    View Project
                  </a>
                )}
              </div>
              {project.description && (
                <p className="text-gray-700 mb-2">{project.description}</p>
              )}
              {project.tech?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tech.map((tech, techIdx) => (
                    <span
                      key={techIdx}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                    >
                      {tech}
                    </span>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-1">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-4">
              <div className="flex justify-between items-start mb-2">
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
    <div className="max-w-4xl mx-auto p-8 bg-white text-black font-serif leading-normal">
      {/* Header */}
      <header className="text-center mb-8 pb-4 border-b-2 border-black">
        <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="text-sm space-y-1">
          <div className="flex justify-center gap-4">
            {data?.contact?.phone && <span>{data.contact.phone}</span>}
            {data?.contact?.email && <span>{data.contact.email}</span>}
          </div>
          {(data?.contact?.city || data?.contact?.state) && (
            <div>{data?.contact?.city && data?.contact?.state ? `${data.contact.city}, ${data.contact.state}` : data?.contact?.city || data?.contact?.state}</div>
          )}
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Professional Summary
          </h2>
          <p className="text-justify leading-relaxed">{data.summary}</p>
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
                  <h3 className="text-base font-bold">{exp.title}</h3>
                  <p className="font-semibold">{exp.company}</p>
                </div>
                <span className="text-sm italic">
                  {exp.start_date} - {exp.end_date || 'Present'}
                </span>
              </div>
              {exp.bullets?.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {exp.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx} className="mb-1">{bullet}</li>
                  ))}
                </ul>
              ) : exp.description && (
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
                  <h3 className="font-bold">{edu.degree}</h3>
                  <p className="italic">{edu.institution}</p>
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
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Technical Skills
          </h2>
          <p className="text-center">{data.skills.join(' • ')}</p>
        </section>
      )}

      {/* Projects */}
      {data?.projects?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Key Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-4">
              <div className="border-b border-gray-300 pb-1 mb-2">
                <h3 className="font-bold">{project.name}</h3>
              </div>
              {project.description && <p className="text-justify mb-2">{project.description}</p>}
              {project.tech?.length > 0 && (
                <p className="text-sm italic">Technologies: {project.tech.join(', ')}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: Certifications */}
      {data?.certifications?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Certifications
          </h2>
          {data.certifications.map((cert, idx) => (
            <div key={cert.id || idx} className="mb-4">
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-2">
                <div>
                  <h3 className="font-bold">{cert.name}</h3>
                  <p className="italic">{cert.issuer}</p>
                </div>
                <span className="text-sm italic">{cert.issue_date}</span>
              </div>
              {cert.credential_id && <p className="text-sm">Credential ID: {cert.credential_id}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: References */}
      {data?.references?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            References
          </h2>
          {data.references.map((ref, idx) => (
            <div key={ref.id || idx} className="mb-4 text-center">
              <div className="font-bold">{ref.name}</div>
              <div>{ref.title} • {ref.company}</div>
              <div className="text-sm">{ref.email} • {ref.phone}</div>
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: Personal Details */}
      {data?.personal_details && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 text-center">
            Personal Information
          </h2>
          <div className="text-center space-y-2">
            {data.personal_details.nationality && (
              <div>Nationality: {data.personal_details.nationality}</div>
            )}
            {data.personal_details.languages?.length > 0 && (
              <div>Languages: {data.personal_details.languages.join(', ')}</div>
            )}
            {data.personal_details.hobbies?.length > 0 && (
              <div>Interests: {data.personal_details.hobbies.join(', ')}</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

// Minimal Template - Clean and spacious
const MinimalTemplate = ({ data }) => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-gray-900 leading-loose font-light">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-5xl font-thin mb-4 tracking-wide">
          {data?.contact?.full_name || 'Your Name'}
        </h1>
        <div className="text-gray-600 space-y-2">
          {data?.contact?.email && <div>{data.contact.email}</div>}
          <div className="flex gap-8 text-sm">
            {data?.contact?.phone && <span>{data.contact.phone}</span>}
            {data?.contact?.city && data?.contact?.state && (
              <span>{data.contact.city}, {data.contact.state}</span>
            )}
            {data?.contact?.linkedin && (
              <a href={data.contact.linkedin} className="text-gray-900 hover:underline">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Summary */}
      {data?.summary && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            About
          </h2>
          <p className="text-lg leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data?.experience?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="mb-8">
              <div className="flex justify-between items-baseline mb-3">
                <div>
                  <h3 className="text-xl font-medium">{exp.title}</h3>
                  <p className="text-gray-600">{exp.company}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {exp.start_date} — {exp.end_date || 'Present'}
                </span>
              </div>
              {exp.bullets?.length > 0 ? (
                <ul className="space-y-2 text-gray-700">
                  {exp.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx} className="pl-4 relative">
                      <span className="absolute left-0 text-gray-400">•</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : exp.description && (
                <div className="text-gray-700 space-y-2">
                  {exp.description.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {data?.projects?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Projects
          </h2>
          {data.projects.map((project, idx) => (
            <div key={project.id || idx} className="mb-6">
              <h3 className="text-lg font-medium mb-2">{project.name}</h3>
              {project.description && (
                <p className="text-gray-700 mb-2">{project.description}</p>
              )}
              {project.tech?.length > 0 && (
                <p className="text-sm text-gray-500">{project.tech.join(' • ')}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data?.education?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-lg font-medium">{edu.degree}</h3>
                  <p className="text-gray-600">{edu.institution}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {edu.start_date} — {edu.end_date || 'Present'}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data?.skills?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Skills
          </h2>
          <p className="text-gray-700">{data.skills.join(' • ')}</p>
        </section>
      )}

      {/* Phase 9: Certifications */}
      {data?.certifications?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Certifications
          </h2>
          {data.certifications.map((cert, idx) => (
            <div key={cert.id || idx} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-lg font-medium">{cert.name}</h3>
                  <p className="text-gray-600">{cert.issuer}</p>
                </div>
                <span className="text-sm text-gray-500">{cert.issue_date}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Phase 9: References */}
      {data?.references?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            References
          </h2>
          <div className="space-y-4">
            {data.references.map((ref, idx) => (
              <div key={ref.id || idx}>
                <div className="font-medium">{ref.name}</div>
                <div className="text-gray-600">{ref.title} • {ref.company}</div>
                <div className="text-sm text-gray-500">{ref.email}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phase 9: Personal Details */}
      {data?.personal_details && (
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest font-medium mb-6 text-gray-500">
            Additional Information
          </h2>
          <div className="space-y-3 text-gray-700">
            {data.personal_details.languages?.length > 0 && (
              <div>Languages: {data.personal_details.languages.join(', ')}</div>
            )}
            {data.personal_details.hobbies?.length > 0 && (
              <div>Interests: {data.personal_details.hobbies.join(', ')}</div>
            )}
            {data.personal_details.nationality && (
              <div>Nationality: {data.personal_details.nationality}</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default ResumePreview;