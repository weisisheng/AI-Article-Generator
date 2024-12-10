'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { Article } from '@/types/article'

const articleSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
  })),
  conclusion: z.string(),
})

type GenerateArticleResponse = {
  success: true;
  article: Article;
} | {
  success: false;
  error: string;
}

export async function generateArticle(
  title: string, 
  model: 'anthropic' | 'openai', 
  selectedTones: string[],
  language: 'en' | 'id' = 'en'
): Promise<GenerateArticleResponse> {
  try {
    const aiModel = model === 'anthropic' 
      ? anthropic('claude-3-sonnet-20240229')
      : openai('gpt-4-turbo')

    const tonesDescription = selectedTones.length > 0
      ? `Use the following tones in your writing: ${selectedTones.join(', ')}. Blend these tones naturally throughout the article. `
      : ''

    const languageInstruction = language === 'id'
      ? 'Write the article in Indonesian (Bahasa Indonesia). '
      : 'Write the article in English. '

    const response = await generateObject({
      model: aiModel,
      schema: articleSchema,
      prompt: `Generate a Medium-style article with the title: "${title}". 
               ${languageInstruction}
               ${tonesDescription}
               The article should have an engaging introduction, 3 main sections with clear headings, and a thought-provoking conclusion.
               Format the content using HTML tags:
               - Use <h1> for the title
               - Use <p> for the introduction
               - Use <h2> for section headings
               - Use <p> for section content
               - Use <p> for the conclusion
               You can also use other HTML tags like <strong>, <em>, <ul>, <li> where appropriate.
               Ensure the content is informative, well-structured, and tailored to the selected tones.`,
    })

    // Debug: Periksa struktur response
    console.log('AI Response:', JSON.stringify(response, null, 2))

    // Pastikan response memiliki data yang diharapkan
    if (!response?.object || typeof response.object !== 'object') {
      throw new Error('Invalid response from AI model')
    }

    // Convert result to plain object dengan type safety
    const plainArticle: Article = {
      title: response.object.title,
      introduction: response.object.introduction,
      sections: response.object.sections.map((section: { heading: string; content: string }) => ({
        heading: section.heading,
        content: section.content
      })),
      conclusion: response.object.conclusion
    }

    return { 
      success: true, 
      article: plainArticle 
    }
  } catch (error) {
    console.error('Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return { 
      success: false, 
      error: error instanceof Error 
        ? `Failed to generate article: ${error.message}`
        : 'Failed to generate article' 
    }
  }
}

