import { HttpException, Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: { role: 'system' | 'user' | 'assistant'; content: string };
  }[];
}

interface MistralErrorResponse {
  error?: { message?: string };
}

@Injectable()
export class MistralService {
  private readonly API_URL = 'https://api.mistral.ai/v1/chat/completions';
  private readonly API_KEY = process.env.MISTRAL_API_KEY;

  private readonly modificationKeywords = {
    shorten: [
      'коротше',
      'скороти',
      'зменши',
      'стисни',
      'резюмуй',
      'резюме',
      'shorter',
      'summarize',
      'condense',
      'brief',
      'compress',
    ],
    expand: [
      'розшир',
      'доповни',
      'глибше',
      'більше деталей',
      'розгорни',
      'expand',
      'elaborate',
      'more details',
      'deepen',
    ],
    simplify: [
      'спрост',
      'зроби простіше',
      'зрозуміліше',
      'легше',
      'simplify',
      'easier',
      'make it simple',
      'clarify',
    ],
    rephrase: [
      'перефразуй',
      'по-іншому',
      'інакше скажи',
      'інакше сформулюй',
      'rephrase',
      'reword',
      'rewrite',
      'alternative phrasing',
    ],
    veryShort: [
      'дуже коротко',
      'зроби дуже коротким',
      'make it very short',
      'shortest',
    ],
  };

  private detectModification(request: string): string | null {
    const lowerRequest = request.toLowerCase();
    for (const [type, keywords] of Object.entries(this.modificationKeywords)) {
      if (keywords.some((keyword) => lowerRequest.includes(keyword))) {
        return type;
      }
    }
    return null;
  }

  private getSchoolSubjectPrompt(subject: string, topic: string): string {
    const lowerSubject = subject.toLowerCase();

    const prompts: Record<string, string> = {
      mathematics: `You are a teacher in the subject of Mathematics. Please explain the concept of ${topic} in a clear and understandable manner. Provide examples and step-by-step solutions to problems. Be concise and ensure that the explanation is suitable for high school students.`,
      physics: `You are a physics teacher. Explain the topic of ${topic} in detail. Provide relevant formulas, real-world applications, and examples that help students understand the concept. Include diagrams if necessary. Make sure the explanation is accurate and at a high school level.`,
      chemistry: `You are a chemistry teacher. Explain the concept of ${topic}, covering key principles, reactions, and relevant scientific laws. Provide examples and experiments that help students better understand the topic. Your explanation should be detailed yet clear for high school students.`,
      biology: `You are a biology teacher. Explain the topic of ${topic}. Include key facts, diagrams (if necessary), and real-world examples. Focus on ensuring high school students understand the biological concepts. Explain in simple terms, but with enough detail for students to grasp the subject.`,
      history: `You are a history teacher. Provide a detailed explanation of the topic of ${topic}. Cover important historical events, figures, and their significance. Provide context and explain how this topic fits into the broader historical narrative. Ensure the explanation is understandable for high school students.`,
      geography: `You are a geography teacher. Explain the topic of ${topic}, covering important geographical features, concepts, and real-world examples. Make sure the explanation is accurate, and appropriate for high school students. Provide maps or diagrams if necessary.`,
      literature: `You are a literature teacher. Analyze the topic of ${topic}, whether it's a specific work, author, or literary period. Provide insights into themes, characters, and literary techniques. Explain how this work is relevant to the study of literature at the high school level.`,
      'foreign language': `You are a language teacher. Explain the key grammar, vocabulary, or language rules related to the topic of ${topic}. Provide examples and practice sentences that help high school students understand the usage of these rules. Include pronunciation tips if applicable.`,
      art: `You are an art teacher. Explain the principles of art related to the topic of ${topic}. Discuss relevant techniques, famous artists, and examples of works that showcase the topic. Your explanation should be detailed and accessible for high school students.`,
      music: `You are a music teacher. Explain the musical concepts related to the topic of ${topic}. Cover music theory, instruments, composers, or styles as appropriate. Provide examples from famous works that illustrate the concepts. Make sure the explanation is clear for high school students.`,
    };

    return (
      prompts[lowerSubject] ||
      `You are a teacher of ${subject}. Please explain the topic of ${topic} in a clear and concise manner, appropriate for high school students. Ensure that the explanation includes relevant examples, key points, and any important terminology.`
    );
  }

  async askMistral(
    subject: string,
    topic: string,
    modificationRequest?: string,
    previousAnswer?: string,
  ): Promise<MistralResponse> {
    if (!subject && !topic && !modificationRequest) {
      throw new HttpException(
        'Missing subject/topic or modification request',
        400,
      );
    }

    const modification = this.detectModification(modificationRequest || '');

    let prompt: string;

    if (modification && previousAnswer) {
      switch (modification) {
        case 'shorten':
          prompt = `Скороти наступну інформацію до ключових моментів:\n${previousAnswer}`;
          break;
        case 'expand':
          prompt = `Розгорни детальніше цю відповідь:\n${previousAnswer}`;
          break;
        case 'simplify':
          prompt = `Поясни простішими словами:\n${previousAnswer}`;
          break;
        case 'rephrase':
          prompt = `Перефразуй наступну відповідь:\n${previousAnswer}`;
          break;
        case 'veryShort':
          prompt = `Зроби наступну відповідь максимально короткою:\n${previousAnswer}`;
          break;
        default:
          prompt = previousAnswer;
      }
    } else {
      prompt = this.getSchoolSubjectPrompt(subject, topic);
    }

    try {
      const response: AxiosResponse<MistralResponse> = await axios.post(
        this.API_URL,
        {
          model: 'mistral-medium',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | MistralErrorResponse
          | undefined;
        console.error(
          'Mistral API Error:',
          errorData?.error?.message || error.message,
        );

        throw new HttpException(
          `Error while contacting Mistral: ${error.response?.status} ${errorData?.error?.message || error.message}`,
          500,
        );
      }

      console.error('Unexpected Error:', error);
      throw new HttpException('Unexpected error occurred', 500);
    }
  }
}
