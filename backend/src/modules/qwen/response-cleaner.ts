/**
 * Qwen 응답 정제 서비스
 * 중국어만 감지 및 제거 (한국어 + 영어 기술용어는 필수)
 */

interface CleaningResult {
  cleaned: string;
  hasChinese: boolean;
  confidence: number; // 한국어 순수성 (0-1)
  chineseCharCount: number;
}

export class ResponseCleaner {
  /**
   * 중국어 문자 감지 (CJK Unified Ideographs + 추가 범위)
   */
  private static readonly CHINESE_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

  /**
   * 한글 문자 범위
   */
  private static readonly KOREAN_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;

  /**
   * 코드 블록 (절대 건드리면 안 됨)
   */
  private static readonly CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

  /**
   * 인라인 코드 (절대 건드리면 안 됨)
   */
  private static readonly INLINE_CODE_REGEX = /`[^`]+`/g;

  /**
   * 1단계: 언어별 통계
   */
  static analyzeLanguageContent(text: string): {
    koreanCount: number;
    chineseCount: number;
    totalCharCount: number;
  } {
    const korean = (text.match(this.KOREAN_REGEX) || []).length;
    const chinese = (text.match(this.CHINESE_REGEX) || []).length;
    const totalChars = text.length;

    return {
      koreanCount: korean,
      chineseCount: chinese,
      totalCharCount: totalChars,
    };
  }

  /**
   * 2단계: 중국어만 제거
   * 코드블록과 인라인 코드는 절대 건드리지 않음
   */
  static removeChinese(text: string): string {
    // Step 1: 코드 블록 추출
    const codeBlocks: string[] = [];
    let preservedText = text.replace(this.CODE_BLOCK_REGEX, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Step 2: 인라인 코드 추출
    const inlineCodes: string[] = [];
    preservedText = preservedText.replace(this.INLINE_CODE_REGEX, (match) => {
      inlineCodes.push(match);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // Step 3: 중국어만 제거 (영어, 숫자, 기호, 한글은 유지)
    preservedText = preservedText.replace(this.CHINESE_REGEX, '');

    // Step 4: 인라인 코드 복원
    inlineCodes.forEach((code, index) => {
      preservedText = preservedText.replace(
        `__INLINE_CODE_${index}__`,
        code,
      );
    });

    // Step 5: 코드 블록 복원
    codeBlocks.forEach((block, index) => {
      preservedText = preservedText.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return preservedText;
  }

  /**
   * 3단계: 불필요한 빈 줄 및 여백 정리
   */
  static cleanWhitespace(text: string): string {
    return (
      text
        // 3개 이상의 연속 빈 줄을 2줄로 축소
        .replace(/\n\n\n+/g, '\n\n')
        // 라인 끝 불필요한 공백 제거
        .replace(/[ \t]+$/gm, '')
        // 시작과 끝의 공백 제거
        .trim()
    );
  }

  /**
   * 4단계: 한국어 순수성 검사 (중국어 제거 후 신뢰도)
   */
  static calculatePurity(text: string): number {
    if (text.length === 0) return 0;

    const analysis = this.analyzeLanguageContent(text);

    // 중국어가 남아있으면 신뢰도 감소
    if (analysis.chineseCount > 0) {
      return Math.max(0, 1 - analysis.chineseCount / analysis.totalCharCount);
    }

    // 중국어가 없으면 신뢰도 높음
    return 1;
  }

  /**
   * 5단계: 문단 별 정제 (부분 중국어 감지 및 제거)
   */
  static cleanParagraphWise(text: string): string {
    const paragraphs = text.split('\n\n');

    const cleanedParagraphs = paragraphs
      .map((para) => {
        const analysis = this.analyzeLanguageContent(para);

        // 중국어가 있으면 제거
        if (analysis.chineseCount > 0) {
          return this.removeChinese(para);
        }

        return para;
      })
      .filter((para) => para.trim().length > 0);

    return cleanedParagraphs.join('\n\n');
  }

  /**
   * 6단계: 재시도 판정 (응답에 중국어가 있으면 재시도 요청)
   */
  static shouldRetry(text: string): boolean {
    const analysis = this.analyzeLanguageContent(text);
    // 중국어가 전체의 10% 이상이면 재시도 권장
    return analysis.chineseCount > analysis.totalCharCount * 0.1;
  }

  /**
   * 7단계: 통합 정제 (메인 메서드)
   */
  static clean(text: string): CleaningResult {
    const beforeAnalysis = this.analyzeLanguageContent(text);

    // Step 1: 문단별 정제
    let cleaned = this.cleanParagraphWise(text);

    // Step 2: 여백 정리
    cleaned = this.cleanWhitespace(cleaned);

    const afterAnalysis = this.analyzeLanguageContent(cleaned);
    const confidence = this.calculatePurity(cleaned);

    return {
      cleaned,
      hasChinese: afterAnalysis.chineseCount > 0,
      confidence,
      chineseCharCount: afterAnalysis.chineseCount,
    };
  }

  /**
   * 응답 품질 점수 (0-100)
   * 중국어 부재, 코드 완전성, 한국어 내용 등을 종합
   */
  static getQualityScore(
    text: string,
    beforeCleaning: string,
  ): { score: number; issues: string[] } {
    const analysis = this.analyzeLanguageContent(text);
    const beforeAnalysis = this.analyzeLanguageContent(beforeCleaning);
    const issues: string[] = [];

    let score = 100;

    // 중국어 부재 확인
    if (beforeAnalysis.chineseCount > 0) {
      if (analysis.chineseCount > 0) {
        // 정제 후에도 중국어가 남아있음 (경고)
        score -= Math.min(30, analysis.chineseCount * 2);
        issues.push(`경고: 중국어 ${analysis.chineseCount}자 남아있음`);
      }
      // 중국어가 완벽히 제거됨 (OK)
    }

    // 한국어 내용 확인
    if (analysis.koreanCount < 10) {
      score -= 20;
      issues.push('한국어 내용이 부족함');
    }

    // 너무 짧으면 경고
    if (text.length < 50) {
      score -= 15;
      issues.push('응답이 너무 짧음');
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * 디버깅용: 상세 분석 리포트
   */
  static getDetailedReport(text: string): string {
    const analysis = this.analyzeLanguageContent(text);
    const cleaned = this.clean(text);
    const quality = this.getQualityScore(cleaned.cleaned, text);

    return `
=== 응답 정제 분석 리포트 ===
원본:
  - 전체 길이: ${text.length}자
  - 한국어: ${analysis.koreanCount}자
  - 중국어: ${analysis.chineseCount}자

정제 후:
  - 길이: ${cleaned.cleaned.length}자
  - 중국어: ${cleaned.chineseCharCount}자
  - 신뢰도: ${(cleaned.confidence * 100).toFixed(1)}%

품질점수: ${quality.score}/100
이슈: ${quality.issues.length > 0 ? quality.issues.join(', ') : '없음'}
재시도 권장: ${this.shouldRetry(text) ? '예' : '아니오'}
    `.trim();
  }
}
