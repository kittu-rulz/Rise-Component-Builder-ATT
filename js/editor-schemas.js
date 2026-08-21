const field = (id, label, type, options = {}) => ({ id, label, type, ...options });

const contentFields = [
  field('title', 'Item Title', 'text', { required: true, default: 'New Item' }),
  field('content', 'Item Content', 'richtext', { required: true, default: 'Add content here.' })
];

// Applies to every component (merged into componentFields by getEditorSchema below) —
// a purely decorative background behind the block wrapper, unrelated to any
// component-specific image field (e.g. hotspots' own interactive background).
const sharedComponentFields = [
  field('blockBackgroundImage', 'Block Background Image (Optional)', 'image', {
    required: false, default: '', preferredDimensions: '1600 × 900 px or larger'
  })
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
    itemFields: [
      field('title', 'Tab Label', 'text', { required: true, default: 'New Tab', maxLength: 40 }),
      field('content', 'Tab Content', 'richtext', { required: true, default: 'Add tab content.' }),
      ...visualIconFields
    ]
  },
  'flip-cards': {
    // Items pair up two-at-a-time into one flip card each (index 0+1 = card 1's
    // front+back, 2+3 = card 2's, ...) — see components/flip-cards.js#generateHTML.
    // pairLabels makes that pairing visible in the editor's item headings instead of
    // a flat "Card Face 1, 2, 3, 4" that gives no hint two entries make one card.
    itemLabel: 'Card Face', minItems: 2, pairLabels: ['Front', 'Back'],
    itemFields: [
      field('title', 'Face Title', 'text', { required: true, default: 'Card Face' }),
      field('content', 'Face Content', 'richtext', { required: true, default: 'Add card content.' }),
      ...visualIconFields,
      // Only read from the front face (components/flip-cards.js) — shown on both
      // faces here since itemFields apply uniformly to every item in the pair, same
      // as the icon fields above.
      field('category', 'Category / Tag (Optional — front face only, used for Study mode filtering)', 'text', { required: false, default: '', maxLength: 40 })
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
    itemLabel: 'Timeline Event', minItems: 2,
    itemFields: [
      ...contentFields,
      field('category', 'Category / Stream (Optional)', 'text', { required: false, default: '', maxLength: 40 })
    ]
  },
  'horizontal-timeline': {
    itemLabel: 'Timeline Milestone', minItems: 2, itemFields: contentFields
  },
  'process-flow': {
    itemLabel: 'Process Step', minItems: 2,
    itemFields: [...contentFields, field('durationMinutes', 'Estimated Duration', 'number', { required: false, default: 5, min: 0, max: 999, step: 1 })]
  },
  scenario: {
    // Item 0 is the dialogue prompt; every item after it is a selectable choice button
    // — see components/scenario.js#generateHTML (`items[0]` vs `items.slice(1)`).
    // roleLabels makes that first-item-is-different-in-kind structure visible in the
    // editor instead of a flat "Scenario Entry 1, 2, 3" that reads as if all entries
    // are the same kind of thing.
    itemLabel: 'Scenario Entry', minItems: 2, roleLabels: ['Prompt', 'Choice'],
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
    // The player only ever renders items[0] (components/audio-player.js#generateHTML)
    // — it plays one track, not a playlist. maxItems stops the editor from letting an
    // author add a 2nd/3rd track that would be silently accepted but never shown
    // anywhere (not in preview, not in the export).
    itemLabel: 'Audio Track', minItems: 1, maxItems: 1,
    itemFields: [
      field('title', 'Audio Title', 'text', { required: true, default: 'New Audio Track' }),
      field('content', 'Audio Source', 'audio', { required: true, default: '' }),
      ...visualIconFields,
      field('transcript', 'Transcript', 'richtext', { required: false, default: '', warningWhen: 'content', warningUnlessAny: ['transcript'], warningMessage: 'Instructional audio should include a transcript.' })
    ]
  },
  'video-frame': {
    // Same reasoning as audio-player above: only items[0] is ever rendered
    // (components/video-frame.js#generateHTML) — one embedded video, not a playlist.
    itemLabel: 'Video', minItems: 1, maxItems: 1,
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
  'interactive-video': {
    // The video itself (source/poster/captions/transcript) is component-level content,
    // matching video-frame's field naming exactly (posterImage/captionsUrl/transcript,
    // not the "-MediaId" suffix the initial proposal used) — componentFields is the
    // established place for "content the author configures once," same as hotspots'
    // background image. Interaction markers are the dynamic items list; a video with
    // zero markers is a valid, complete configuration (minItems: 0) — the video itself,
    // not the marker count, is what validate() actually requires.
    itemLabel: 'Interaction Marker', minItems: 0, componentLabel: 'Video Details',
    componentFields: [
      field('title', 'Video Block Title', 'text', { required: true, default: 'Interactive Video', maxLength: 120 }),
      field('introduction', 'Introduction (Optional)', 'richtext', { required: false, default: '' }),
      field('videoSourceType', 'Video Source', 'select', {
        // Defaults mirror components/interactive-video.js#defaultConfig exactly, not just
        // "a" valid default — app.js#loadComponentToEditor applies componentFields'
        // schema defaults on top of defaultConfig immediately after setting it (the same
        // ordering every componentFields-using component goes through), so a mismatch
        // here would silently clobber a real starting value back to empty the moment the
        // component is freshly selected from the catalog.
        default: 'url', options: [{ value: 'upload', label: 'Uploaded video' }, { value: 'url', label: 'External direct video URL' }]
      }),
      field('videoMediaId', 'Upload Video', 'video', { required: false, default: '' }),
      field('videoUrl', 'External Video URL (direct .mp4/.webm file, not a YouTube/Vimeo page)', 'url', { required: false, default: 'https://www.w3schools.com/html/mov_bbb.mp4' }),
      field('posterImage', 'Poster Image (Optional)', 'image', { required: false, default: '', preferredDimensions: '1280 × 720 px (16:9)' }),
      field('posterAltText', 'Poster Alternative Text', 'textarea', {
        required: false, default: '', warningWhen: 'posterImage', warningUnless: 'posterDecorative',
        warningMessage: 'Add poster alternative text or mark it decorative.'
      }),
      field('posterDecorative', 'Poster Is Decorative', 'checkbox', { default: false }),
      field('captionsUrl', 'Captions (WebVTT)', 'url', { required: false, default: '', uploadKind: 'captions' }),
      field('captionsLabel', 'Captions Label', 'text', { required: false, default: 'English', maxLength: 40 }),
      field('transcript', 'Transcript (Optional)', 'richtext', { required: false, default: '' })
    ],
    itemFields: [
      field('type', 'Interaction Type', 'select', {
        required: true, default: 'information', options: [{ value: 'information', label: 'Information' }, { value: 'multipleChoice', label: 'Multiple Choice' }]
      }),
      field('timestamp', 'Timestamp (seconds)', 'number', { required: true, default: 0, min: 0, step: 1 }),
      field('title', 'Marker Title', 'text', { required: true, default: 'New Marker', maxLength: 80 }),
      field('required', 'Required (learner must complete this to finish the video)', 'checkbox', { default: false }),
      field('pauseVideo', 'Pause Video At This Marker', 'checkbox', { default: true }),
      field('continueButtonLabel', 'Continue Button Label', 'text', { required: false, default: 'Continue', maxLength: 30 }),
      field('body', 'Information Body (Information type only)', 'richtext', { required: false, default: '' }),
      field('question', 'Question (Multiple Choice type only)', 'richtext', { required: false, default: '' }),
      field('answer1Label', 'Answer 1 (Multiple Choice type only)', 'text', { required: false, default: '', maxLength: 200 }),
      field('answer2Label', 'Answer 2 (Multiple Choice type only)', 'text', { required: false, default: '', maxLength: 200 }),
      field('answer3Label', 'Answer 3 (Multiple Choice type only, optional)', 'text', { required: false, default: '', maxLength: 200 }),
      field('answer4Label', 'Answer 4 (Multiple Choice type only, optional)', 'text', { required: false, default: '', maxLength: 200 }),
      field('correctAnswerIndex', 'Correct Answer (Multiple Choice type only)', 'select', { default: '1', options: ['1', '2', '3', '4'] }),
      field('answer1Feedback', 'Feedback for Answer 1 (Optional)', 'textarea', { required: false, default: '' }),
      field('answer2Feedback', 'Feedback for Answer 2 (Optional)', 'textarea', { required: false, default: '' }),
      field('answer3Feedback', 'Feedback for Answer 3 (Optional)', 'textarea', { required: false, default: '' }),
      field('answer4Feedback', 'Feedback for Answer 4 (Optional)', 'textarea', { required: false, default: '' }),
      field('generalCorrectFeedback', 'General Correct Feedback (Multiple Choice type only)', 'textarea', { required: false, default: '' }),
      field('generalIncorrectFeedback', 'General Incorrect Feedback (Multiple Choice type only)', 'textarea', { required: false, default: '' }),
      field('hint', 'Hint (Multiple Choice type only, optional)', 'textarea', { required: false, default: '' }),
      field('maxAttempts', 'Maximum Attempts (Multiple Choice type only)', 'number', { required: false, default: 1, min: 1, max: 5, step: 1 }),
      field('showCorrectAfterFinal', 'Reveal Correct Answer After Final Attempt (Multiple Choice type only)', 'checkbox', { default: false })
    ]
  }
};

export function getEditorSchema(componentId) {
  const schema = editorSchemas[componentId] || { itemLabel: 'Item', minItems: 1, itemFields: contentFields };
  return {
    ...schema,
    componentLabel: schema.componentLabel || 'Block Background',
    componentFields: [...sharedComponentFields, ...(schema.componentFields || [])]
  };
}

export function createDefaultItem(schema) {
  return Object.fromEntries(schema.itemFields.map(itemField => [itemField.id, structuredClone(itemField.default ?? '')]));
}
