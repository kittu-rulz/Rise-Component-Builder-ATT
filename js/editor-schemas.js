const field = (id, label, type, options = {}) => ({ id, label, type, ...options });

const contentFields = [
  field('title', 'Item Title', 'text', { required: true, default: 'New Item' }),
  field('content', 'Item Content', 'richtext', { required: true, default: 'Add content here.' })
];

const visualIconFields = [
  field('iconImage', 'Custom Icon or Image (Optional)', 'image', { required: false, default: '', preferredDimensions: '256 × 256 px (square)' }),
  field('iconAltText', 'Icon or Image Alternative Text', 'textarea', {
    required: false, default: '', warningWhen: 'iconImage', warningUnless: 'iconDecorative',
    warningMessage: 'Add alternative text or mark the custom icon or image decorative.'
  }),
  field('iconDecorative', 'Custom Icon or Image Is Decorative', 'checkbox', { default: false }),
  field('iconFit', 'Custom Icon or Image Fit', 'select', {
    default: 'contain', options: [{ value: 'contain', label: 'Contain' }, { value: 'cover', label: 'Cover' }]
  })
];

export const editorSchemas = {
  accordion: {
    itemLabel: 'Accordion Section', minItems: 1,
    itemFields: [field('title', 'Section Title', 'text', { required: true, default: 'New Section', maxLength: 120 }), field('content', 'Section Content', 'richtext', { required: true, default: 'Add section content.' })]
  },
  'tab-blocks': {
    itemLabel: 'Tab', minItems: 2,
    itemFields: [field('title', 'Tab Label', 'text', { required: true, default: 'New Tab', maxLength: 40 }), field('content', 'Tab Content', 'richtext', { required: true, default: 'Add tab content.' })]
  },
  'flip-cards': {
    itemLabel: 'Card Face', minItems: 2,
    itemFields: [
      field('title', 'Face Title', 'text', { required: true, default: 'Card Face' }),
      field('content', 'Face Content', 'richtext', { required: true, default: 'Add card content.' }),
      ...visualIconFields
    ]
  },
  hotspots: {
    itemLabel: 'Hotspot', minItems: 1, componentLabel: 'Hotspot background',
    componentFields: [
      field('backgroundImage', 'Background Image', 'image', { required: false, default: '', preferredDimensions: '1600 × 900 px (16:9)' }),
      field('backgroundAltText', 'Background Alternative Text', 'textarea', { required: false, default: '', warningWhen: 'backgroundImage', warningUnless: 'backgroundDecorative', warningMessage: 'Add alternative text or mark the background decorative.' }),
      field('backgroundDecorative', 'Background Image Is Decorative', 'checkbox', { default: false }),
      field('backgroundFit', 'Background Image Fit', 'select', { default: 'contain', options: [{ value: 'contain', label: 'Contain' }, { value: 'cover', label: 'Cover' }] }),
      field('backgroundFocalX', 'Horizontal Focal Point', 'range', { default: 50, min: 0, max: 100, step: 1, suffix: '%' }),
      field('backgroundFocalY', 'Vertical Focal Point', 'range', { default: 50, min: 0, max: 100, step: 1, suffix: '%' })
    ],
    itemFields: [
      field('title', 'Hotspot Label', 'text', { required: true, default: 'New Hotspot' }),
      field('content', 'Hotspot Content', 'richtext', { required: true, default: 'Add hotspot content.' }),
      field('x', 'Horizontal Position', 'range', { required: true, default: 50, min: 0, max: 100, step: 1, suffix: '%' }),
      field('y', 'Vertical Position', 'range', { required: true, default: 50, min: 0, max: 100, step: 1, suffix: '%' })
    ]
  },
  'button-list': {
    itemLabel: 'Link Button', minItems: 1,
    itemFields: [field('title', 'Button Label', 'text', { required: true, default: 'New Resource' }), field('content', 'Destination URL', 'url', { required: true, default: 'https://' })]
  },
  'menu-list': {
    itemLabel: 'Menu Item', minItems: 1, itemFields: contentFields
  },
  'multiple-choice': {
    itemLabel: 'Answer Option', minItems: 2,
    itemFields: [
      field('label', 'Answer Option', 'richtext', { required: true, default: 'New option' }),
      field('content', 'Answer Feedback', 'textarea', { required: false, default: 'Add feedback for this option.' }),
      field('correct', 'Correct Answer', 'radio', { default: false, groupAcrossItems: true, requiredOne: true })
    ]
  },
  'multiple-select': {
    itemLabel: 'Answer Option', minItems: 2,
    itemFields: [
      field('label', 'Answer Option', 'richtext', { required: true, default: 'New option' }),
      field('content', 'Answer Feedback', 'textarea', { required: false, default: 'Add feedback for this option.' }),
      field('correct', 'Correct Answer', 'checkbox', { default: false })
    ]
  },
  'sorting-activity': {
    itemLabel: 'Sortable Item', minItems: 2,
    itemFields: [
      field('title', 'Item Label', 'text', { required: true, default: 'New Sortable Item' }),
      field('content', 'Item Description', 'textarea', { required: false, default: '' }),
      field('category', 'Correct Category', 'select', { required: true, default: 'Design', options: ['Design', 'Logic'] })
    ]
  },
  'fill-blank': {
    itemLabel: 'Blank Statement', minItems: 1,
    itemFields: [field('title', 'Sentence with [blank]', 'richtext', { required: true, default: 'Enter a sentence containing [blank].', pattern: '\\[blank\\]', patternMessage: 'Include one [blank] token.' }), field('content', 'Accepted Answer', 'text', { required: true, default: 'answer' })]
  },
  'vertical-timeline': {
    itemLabel: 'Timeline Event', minItems: 2, itemFields: contentFields
  },
  'horizontal-timeline': {
    itemLabel: 'Timeline Milestone', minItems: 2, itemFields: contentFields
  },
  'process-flow': {
    itemLabel: 'Process Step', minItems: 2,
    itemFields: [...contentFields, field('durationMinutes', 'Estimated Duration', 'number', { required: false, default: 5, min: 0, max: 999, step: 1 })]
  },
  scenario: {
    itemLabel: 'Scenario Entry', minItems: 2,
    itemFields: [field('title', 'Scene or Choice Label', 'text', { required: true, default: 'New Scenario Entry' }), field('content', 'Dialogue or Feedback', 'richtext', { required: true, default: 'Add scenario content.' })]
  },
  'profile-cards': {
    itemLabel: 'Profile', minItems: 1,
    itemFields: [
      field('title', 'Name', 'text', { required: true, default: 'New Profile' }),
      field('content', 'Role and Biography', 'richtext', { required: true, default: 'Add role and biography.' }),
      field('image', 'Profile Image', 'image', { required: false, default: '', preferredDimensions: '800 × 800 px (square)' }),
      field('altText', 'Profile Image Alternative Text', 'textarea', { default: '', warningWhen: 'image', warningUnless: 'decorative', warningMessage: 'Add alternative text or mark the profile image decorative.' }),
      field('decorative', 'Profile Image Is Decorative', 'checkbox', { default: false }),
      field('imageCrop', 'Profile Image Presentation', 'select', { default: 'circle', options: [{ value: 'circle', label: 'Circular' }, { value: 'square', label: 'Square' }] })
    ]
  },
  'info-grid': {
    itemLabel: 'Information Card', minItems: 1,
    itemFields: [...contentFields, ...visualIconFields, field('accentColor', 'Card Accent Color', 'color', { required: false, default: '#2563EB' })]
  },
  'pricing-comparison': {
    itemLabel: 'Comparison Option', minItems: 2,
    itemFields: [...contentFields, field('highlighted', 'Highlight This Option', 'checkbox', { default: false }), field('actionUrl', 'Action URL', 'url', { required: false, default: '' })]
  },
  'audio-player': {
    itemLabel: 'Audio Track', minItems: 1,
    itemFields: [
      field('title', 'Audio Title', 'text', { required: true, default: 'New Audio Track' }),
      field('content', 'Audio Source', 'audio', { required: true, default: '' }),
      ...visualIconFields,
      field('transcript', 'Transcript', 'richtext', { required: false, default: '', warningWhen: 'content', warningUnlessAny: ['transcript'], warningMessage: 'Instructional audio should include a transcript.' })
    ]
  },
  'video-frame': {
    itemLabel: 'Video', minItems: 1,
    itemFields: [
      field('title', 'Accessible Video Title', 'text', { required: true, default: 'New Video' }),
      field('content', 'Video Source', 'video', { required: true, default: '' }),
      field('posterImage', 'Poster Image', 'image', { required: false, default: '', preferredDimensions: '1280 × 720 px (16:9)' }),
      field('posterAltText', 'Poster Alternative Text', 'textarea', { default: '', warningWhen: 'posterImage', warningUnless: 'posterDecorative', warningMessage: 'Add poster alternative text or mark it decorative.' }),
      field('posterDecorative', 'Poster Is Decorative', 'checkbox', { default: false }),
      field('captionsUrl', 'Captions (WebVTT)', 'url', { required: false, default: '', uploadKind: 'captions', warningWhen: 'content', warningUnlessAny: ['captionsUrl', 'transcript'], warningMessage: 'Provide captions or a transcript for this video.' }),
      field('transcript', 'Video Transcript', 'richtext', { required: false, default: '', warningWhen: 'content', warningUnlessAny: ['captionsUrl', 'transcript'], warningMessage: 'Provide captions or a transcript for this video.' }),
      field('audioDescription', 'Audio Description or Visual Transcript', 'richtext', { required: false, default: '' })
    ]
  },
  'image-gallery': {
    itemLabel: 'Gallery Image', minItems: 1,
    itemFields: [
      field('content', 'Image Source', 'image', { required: true, default: '', multiple: true, preferredDimensions: '1600 × 1200 px (4:3)' }),
      field('title', 'Image Title', 'text', { required: true, default: 'New Image' }),
      field('caption', 'Image Caption', 'textarea', { required: false, default: '' }),
      field('altText', 'Alternative Text', 'textarea', { required: false, default: '', warningWhen: 'content', warningUnless: 'decorative', warningMessage: 'Add alternative text or mark this image decorative.' }),
      field('decorative', 'Image Is Decorative', 'checkbox', { default: false }),
      field('imageFit', 'Image Fit', 'select', { default: 'cover', options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }] })
    ]
  },
  'ai-generator': {
    itemLabel: 'AI Prompt', minItems: 1,
    itemFields: [field('title', 'Prompt Name', 'text', { required: true, default: 'AI Scenario Prompt' }), field('content', 'Prompt', 'textarea', { required: true, default: 'Describe the scenario to generate.' })]
  },
  'ai-quiz-maker': {
    itemLabel: 'AI Quiz Prompt', minItems: 1,
    itemFields: [field('title', 'Prompt Name', 'text', { required: true, default: 'AI Quiz Prompt' }), field('content', 'Prompt', 'textarea', { required: true, default: 'Describe the quiz to generate.' })]
  }
};

export function getEditorSchema(componentId) {
  return editorSchemas[componentId] || { itemLabel: 'Item', minItems: 1, itemFields: contentFields };
}

export function createDefaultItem(schema) {
  return Object.fromEntries(schema.itemFields.map(itemField => [itemField.id, structuredClone(itemField.default ?? '')]));
}
