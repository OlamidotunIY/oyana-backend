import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Storage,
  type GetSignedUrlConfig,
  type StorageOptions,
} from '@google-cloud/storage';

type SignedUploadUrlOptions = {
  bucketName: string;
  objectPath: string;
  expiresInSeconds: number;
  contentType?: string;
};

@Injectable()
export class GoogleStorageService {
  private readonly storage: Storage;

  constructor(private readonly configService: ConfigService) {
    this.storage = new Storage(this.buildStorageOptions());
  }

  async createSignedUploadUrl(
    options: SignedUploadUrlOptions,
  ): Promise<string> {
    const file = this.storage
      .bucket(this.requireBucketName(options.bucketName))
      .file(options.objectPath);

    const config: GetSignedUrlConfig = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + options.expiresInSeconds * 1000,
    };

    if (options.contentType) {
      config.contentType = options.contentType;
    }

    const [url] = await file.getSignedUrl(config);
    return url;
  }

  async downloadAsBuffer(
    bucketName: string,
    objectPath: string,
  ): Promise<Buffer> {
    const file = this.storage
      .bucket(this.requireBucketName(bucketName))
      .file(objectPath);
    const [buffer] = await file.download();
    return buffer;
  }

  private buildStorageOptions(): StorageOptions {
    const projectId = this.readConfig('GOOGLE_CLOUD_PROJECT_ID');
    const keyFilename = this.readConfig('GOOGLE_CLOUD_KEY_FILENAME');
    const clientEmail = this.readConfig('GOOGLE_CLOUD_CLIENT_EMAIL');
    const privateKey = this.readConfig('GOOGLE_CLOUD_PRIVATE_KEY');

    const options: StorageOptions = {};

    if (projectId) {
      options.projectId = projectId;
    }

    if (keyFilename) {
      options.keyFilename = keyFilename;
    } else if (clientEmail && privateKey) {
      options.credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      };
    }

    return options;
  }

  private readConfig(name: string): string | undefined {
    const value = this.configService.get<string>(name)?.trim();
    return value ? value : undefined;
  }

  private requireBucketName(bucketName: string): string {
    const normalized = bucketName.trim();
    if (!normalized) {
      throw new BadRequestException(
        'A Google Cloud Storage bucket name is required',
      );
    }

    return normalized;
  }
}
