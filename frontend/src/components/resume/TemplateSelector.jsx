import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { LayoutTemplate, CheckCircle2 } from 'lucide-react';

const TemplateSelector = ({ selectedTemplate, onTemplateChange, className = '' }) => {
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean design with subtle colors and modern typography',
      preview: '/api/placeholder/200/280',
      features: ['Color accents', 'Icons', 'Badge skills', 'Clean layout']
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional professional format, ATS-friendly',
      preview: '/api/placeholder/200/280',
      features: ['Traditional', 'ATS-friendly', 'Serif font', 'Centered headers']
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple and elegant with plenty of white space',
      preview: '/api/placeholder/200/280',
      features: ['Minimal design', 'Light font', 'Spacious', 'Clean typography']
    }
  ];

  return (
    <div className={`template-selector ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <LayoutTemplate className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Choose Template</h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedTemplate === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:ring-1 hover:ring-gray-300'
            }`}
            onClick={() => onTemplateChange(template.id)}
          >
            <CardContent className="p-4">
              {/* Template Preview */}
              <div className="relative mb-4">
                <div className="aspect-[3/4] bg-gray-100 rounded border flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <LayoutTemplate className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs">Preview</span>
                  </div>
                </div>
                {selectedTemplate === template.id && (
                  <div className="absolute -top-2 -right-2">
                    <CheckCircle2 className="h-6 w-6 text-blue-500 bg-white rounded-full" />
                  </div>
                )}
              </div>
              
              {/* Template Info */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Actions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <LayoutTemplate className="h-4 w-4" />
          <span>
            Selected: <span className="font-semibold">
              {templates.find(t => t.id === selectedTemplate)?.name || 'Modern'}
            </span>
          </span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Your resume will update automatically as you edit. Switch templates anytime to see different styles.
        </p>
      </div>
    </div>
  );
};

export default TemplateSelector;