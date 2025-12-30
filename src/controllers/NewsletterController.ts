import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateNewsletterRequest, UpdateNewsletterRequest } from '../models/Newsletter';
import logger from '../utils/logger';

export class NewsletterController {
  /**
   * Returns available template variables for newsletter designers.
   * Describes recipient columns and data fields with a sample structure.
   */
  static async getTemplateVariables(req: Request, res: Response) {
    try {
      const templateVariables = {
        description: 'Available variables for email template personalization',
        columns: {
          email: {
            type: 'string',
            description: 'Recipient email address',
            example: 'john.doe@example.com'
          },
          registration_date: {
            type: 'date',
            description: 'Date when the recipient subscribed',
            example: '2024-01-15T10:30:00Z'
          },
          last_notification_date: {
            type: 'date',
            description: 'Date of the last notification sent (may be null)',
            example: '2024-06-20T14:00:00Z'
          },
          status: {
            type: 'enum',
            description: 'Subscription status',
            values: ['subscribed', 'unsubscribed'],
            example: 'subscribed'
          }
        },
        dataFields: {
          description: 'Custom fields stored in the recipient data JSON. These are flexible and can contain any structure.',
          commonFields: {
            name: {
              type: 'string',
              description: 'Full name of the recipient',
              example: 'John Doe'
            },
            first_name: {
              type: 'string',
              description: 'First name',
              example: 'John'
            },
            last_name: {
              type: 'string',
              description: 'Last name',
              example: 'Doe'
            },
            gender: {
              type: 'string',
              description: 'Gender for personalized salutations',
              example: 'male'
            },
            company: {
              type: 'string',
              description: 'Company or organization name',
              example: 'Acme Inc'
            },
            title: {
              type: 'string',
              description: 'Job title or professional title',
              example: 'Software Engineer'
            },
            phone: {
              type: 'string',
              description: 'Phone number',
              example: '+1-555-123-4567'
            }
          },
          customFields: {
            description: 'Any additional custom fields can be added to the data object',
            example: {
              preferences: {
                newsletter_frequency: 'weekly',
                topics: ['technology', 'business']
              },
              membership: {
                tier: 'premium',
                since: '2023-01-01'
              }
            }
          }
        },
        sample: {
          recipient: {
            email: 'john.doe@example.com',
            registration_date: '2024-01-15T10:30:00Z',
            last_notification_date: '2024-06-20T14:00:00Z',
            status: 'subscribed',
            data: {
              name: 'John Doe',
              first_name: 'John',
              last_name: 'Doe',
              gender: 'male',
              company: 'Acme Inc',
              title: 'Software Engineer',
              phone: '+1-555-123-4567',
              preferences: {
                newsletter_frequency: 'weekly',
                topics: ['technology', 'business'],
                language: 'en'
              },
              membership: {
                tier: 'premium',
                since: '2023-01-01',
                points: 1250
              },
              address: {
                city: 'San Francisco',
                country: 'USA',
                timezone: 'America/Los_Angeles'
              }
            }
          }
        },
        usage: {
          description: 'How to use these variables in templates',
          examples: [
            '{{recipient.email}} - Access the email address',
            '{{recipient.data.first_name}} - Access first name from data',
            '{{recipient.data.company}} - Access company name',
            '{{recipient.data.preferences.language}} - Access nested preference',
            '{{recipient.data.membership.tier}} - Access membership tier'
          ]
        }
      };

      res.json(templateVariables);
    } catch (error) {
      logger.error('Error fetching template variables:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getNewsletters(req: Request, res: Response) {
    try {
      const newsletters = await DatabaseService.getNewsletters();
      res.json(newsletters);
    } catch (error) {
      logger.error('Error fetching newsletters:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getNewsletterById(req: Request, res: Response) {
    try {
      const { newsletterId } = req.params;
      const newsletter = await DatabaseService.getNewsletterById(newsletterId);
      
      if (!newsletter) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.json(newsletter);
    } catch (error) {
      logger.error('Error fetching newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createNewsletter(req: Request, res: Response) {
    try {
      const newsletterData: CreateNewsletterRequest = req.body;
      const newsletter = await DatabaseService.createNewsletter(newsletterData);
      res.status(201).json(newsletter);
    } catch (error) {
      logger.error('Error creating newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateNewsletter(req: Request, res: Response) {
    try {
      const { newsletterId } = req.params;
      const newsletterData: UpdateNewsletterRequest = { id: newsletterId, ...req.body };
      const newsletter = await DatabaseService.updateNewsletter(newsletterData);
      
      if (!newsletter) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.json(newsletter);
    } catch (error) {
      logger.error('Error updating newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteNewsletter(req: Request, res: Response) {
    try {
      const { newsletterId } = req.params;
      const deleted = await DatabaseService.deleteNewsletter(newsletterId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
