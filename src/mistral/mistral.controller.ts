import { Controller, Get, Query, HttpException } from '@nestjs/common';
import { MistralService } from './mistral.services';
import { MistralResponse } from './mistral.services';
import { AxiosError } from 'axios';

@Controller('mistral')
export class MistralController {
  constructor(private readonly mistralService: MistralService) {}

  @Get('ask')
  async askMistral(
    @Query('subject') subject: string,
    @Query('topic') topic: string,
    @Query('modificationRequest') modificationRequest?: string,
    @Query('previousAnswer') previousAnswer?: string,
  ): Promise<MistralResponse> {
    if (!subject && !topic && !modificationRequest) {
      throw new HttpException(
        'Missing subject/topic or modification request',
        400,
      );
    }

    try {
      const response = await this.mistralService.askMistral(
        subject,
        topic,
        modificationRequest,
        previousAnswer,
      );
      return response;
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = error.response?.data as {
          error?: { message?: string };
        };
        const statusCode = error.response?.status || 500;
        const errorMessage =
          errorData.error?.message || error.message || 'Unknown error';

        throw new HttpException(
          `Error while contacting Mistral: ${statusCode} ${errorMessage}`,
          statusCode,
        );
      }

      console.error('Unexpected Error:', error);
      throw new HttpException('Unexpected error occurred', 500);
    }
  }
}
