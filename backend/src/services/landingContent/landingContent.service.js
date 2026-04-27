const LandingContent = require('../../models/landingContent/landingContent.model');
const { NotFoundError } = require('../../utils/errors');

class LandingContentService {
  /**
   * Get the active landing page content
   */
  async getActiveContent() {
    let content = await LandingContent.getActiveContent();

    if (!content) {
      // Create default content if none exists
      const defaultContent = LandingContent.getDefaultContent();
      content = new LandingContent(defaultContent);
      await content.save();
    }

    return content;
  }

  /**
   * Update landing page content (Super Admin only)
   */
  async updateContent(updateData, userId) {
    let content = await LandingContent.getActiveContent();

    if (!content) {
      // Create new content if none exists
      const defaultContent = LandingContent.getDefaultContent();
      content = new LandingContent({
        ...defaultContent,
        ...updateData,
        updatedBy: userId,
        isActive: true
      });
    } else {
      // Update existing content
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          content[key] = updateData[key];
        }
      });
      content.updatedBy = userId;
    }

    await content.save();
    return content;
  }

  /**
   * Update specific section
   */
  async updateSection(section, data, userId) {
    const allowedSections = [
      'hero', 'stats', 'features', 'howItWorks',
      'pricing', 'testimonials', 'integrations',
      'faq', 'cta', 'footer'
    ];

    if (!allowedSections.includes(section)) {
      throw new Error(`Invalid section: ${section}`);
    }

    let content = await LandingContent.getActiveContent();

    if (!content) {
      const defaultContent = LandingContent.getDefaultContent();
      content = new LandingContent(defaultContent);
    }

    content[section] = data;
    content.updatedBy = userId;
    await content.save();

    return content;
  }

  /**
   * Reset to default content
   */
  async resetToDefault(userId) {
    let content = await LandingContent.getActiveContent();

    if (content) {
      const defaultContent = LandingContent.getDefaultContent();
      Object.keys(defaultContent).forEach(key => {
        content[key] = defaultContent[key];
      });
      content.updatedBy = userId;
      await content.save();
    } else {
      const defaultContent = LandingContent.getDefaultContent();
      content = new LandingContent({
        ...defaultContent,
        updatedBy: userId,
        isActive: true
      });
      await content.save();
    }

    return content;
  }

  /**
   * Get content for public (landing page)
   * Returns only the content without metadata
   */
  async getPublicContent() {
    const content = await this.getActiveContent();

    return {
      hero: content.hero,
      stats: content.stats,
      features: content.features,
      howItWorks: content.howItWorks,
      pricing: content.pricing,
      testimonials: content.testimonials,
      integrations: content.integrations,
      faq: content.faq,
      cta: content.cta,
      footer: content.footer
    };
  }
}

module.exports = new LandingContentService();