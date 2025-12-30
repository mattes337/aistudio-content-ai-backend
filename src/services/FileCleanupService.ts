import { DatabaseService } from './DatabaseService';
import { deleteFile } from '../utils/fileUpload';
import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';

const config = loadEnvConfig();

export class FileCleanupService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the background cleanup scheduler
   */
  start(): void {
    const intervalMs = config.fileCleanupIntervalMinutes * 60 * 1000;
    
    logger.info(`File cleanup service started. Will check every ${config.fileCleanupIntervalMinutes} minutes for files deleted more than ${config.fileCleanupDelayHours} hours ago.`);
    
    // Run immediately on start, then at interval
    this.runCleanup();
    this.intervalId = setInterval(() => this.runCleanup(), intervalMs);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('File cleanup service stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  async runCleanup(): Promise<void> {
    try {
      const deletedSources = await DatabaseService.getDeletedKnowledgeSourcesForCleanup(
        config.fileCleanupDelayHours
      );

      if (deletedSources.length === 0) {
        logger.debug('No files to clean up');
        return;
      }

      logger.info(`Found ${deletedSources.length} deleted knowledge sources to clean up`);

      for (const source of deletedSources) {
        try {
          // Delete the physical file if it exists
          if (source.file_path) {
            const deleted = deleteFile(source.file_path);
            if (deleted) {
              logger.info(`Deleted file: ${source.file_path}`);
            }
          }

          // Hard delete the database record
          await DatabaseService.hardDeleteKnowledgeSource(source.id);
          logger.info(`Hard deleted knowledge source: ${source.id} (${source.name})`);
        } catch (error) {
          logger.error(`Error cleaning up knowledge source ${source.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error during file cleanup:', error);
    }
  }
}

// Singleton instance
export const fileCleanupService = new FileCleanupService();
