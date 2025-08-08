/**
 * Invoice Templates Configuration
 * This file contains different invoice template designs
 */

const templates = {
  // Modern Professional Template
  modern: {
    name: 'Modern Professional',
    description: 'Clean, modern design with professional layout',
    config: {
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#3498db',
        text: '#2c3e50',
        lightText: '#7f8c8d'
      },
      fonts: {
        title: 'Helvetica-Bold',
        subtitle: 'Helvetica-Bold',
        body: 'Helvetica',
        emphasis: 'Helvetica-Bold'
      },
      layout: {
        headerHeight: 200,
        clientSectionHeight: 150,
        itemsStartY: 400,
        totalsStartY: 550
      }
    }
  },

  // Classic Business Template
  classic: {
    name: 'Classic Business',
    description: 'Traditional business invoice with formal layout',
    config: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#333333',
        accent: '#0066cc',
        text: '#000000',
        lightText: '#666666'
      },
      fonts: {
        title: 'Times-Bold',
        subtitle: 'Times-Bold',
        body: 'Times-Roman',
        emphasis: 'Times-Bold'
      },
      layout: {
        headerHeight: 180,
        clientSectionHeight: 140,
        itemsStartY: 380,
        totalsStartY: 520
      }
    }
  },

  // Minimalist Template
  minimalist: {
    name: 'Minimalist',
    description: 'Simple, clean design with minimal elements',
    config: {
      colors: {
        primary: '#000000',
        secondary: '#333333',
        accent: '#000000',
        text: '#000000',
        lightText: '#999999'
      },
      fonts: {
        title: 'Helvetica-Bold',
        subtitle: 'Helvetica',
        body: 'Helvetica',
        emphasis: 'Helvetica-Bold'
      },
      layout: {
        headerHeight: 160,
        clientSectionHeight: 120,
        itemsStartY: 340,
        totalsStartY: 480
      }
    }
  },

  // Romanian Business Template
  romanian: {
    name: 'Romanian Business',
    description: 'Designed specifically for Romanian business requirements',
    config: {
      colors: {
        primary: '#003366',
        secondary: '#0066cc',
        accent: '#ff6600',
        text: '#000000',
        lightText: '#666666'
      },
      fonts: {
        title: 'Helvetica-Bold',
        subtitle: 'Helvetica-Bold',
        body: 'Helvetica',
        emphasis: 'Helvetica-Bold'
      },
      layout: {
        headerHeight: 220,
        clientSectionHeight: 160,
        itemsStartY: 440,
        totalsStartY: 580
      }
    }
  }
};

/**
 * Get template configuration
 * @param {string} templateName - Name of the template
 * @returns {Object} Template configuration
 */
function getTemplate(templateName = 'modern') {
  return templates[templateName] || templates.modern;
}

/**
 * Get all available templates
 * @returns {Object} All templates
 */
function getAllTemplates() {
  return templates;
}

/**
 * Get template names list
 * @returns {Array} Array of template names
 */
function getTemplateNames() {
  return Object.keys(templates);
}

module.exports = {
  getTemplate,
  getAllTemplates,
  getTemplateNames,
  templates
};
