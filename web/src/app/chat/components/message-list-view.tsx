// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { LoadingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  Download,
  Headphones,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LoadingAnimation } from "~/components/deer-flow/loading-animation";
import { Markdown } from "~/components/deer-flow/markdown";
import { RainbowText } from "~/components/deer-flow/rainbow-text";
import { RollingText } from "~/components/deer-flow/rolling-text";
import {
  ScrollContainer,
  type ScrollContainerRef,
} from "~/components/deer-flow/scroll-container";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import type { Message, Option } from "~/core/messages";
import {
  closeResearch,
  openResearch,
  useLastFeedbackMessageId,
  useLastInterruptMessage,
  useMessage,
  useMessageIds,
  useResearchMessage,
  useStore,
} from "~/core/store";
import { parseJSON } from "~/core/utils";
import { cn } from "~/lib/utils";

export function MessageListView({
  className,
  onFeedback,
  onSendMessage,
}: {
  className?: string;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
}) {
  const scrollContainerRef = useRef<ScrollContainerRef>(null);
  const messageIds = useMessageIds();
  const interruptMessage = useLastInterruptMessage();
  const waitingForFeedbackMessageId = useLastFeedbackMessageId();
  const responding = useStore((state) => state.responding);
  const noOngoingResearch = useStore(
    (state) => state.ongoingResearchId === null,
  );
  const ongoingResearchIsOpen = useStore(
    (state) => state.ongoingResearchId === state.openResearchId,
  );

  const handleToggleResearch = useCallback(() => {
    // Fix the issue where auto-scrolling to the bottom
    // occasionally fails when toggling research.
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollToBottom();
      }
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <ScrollContainer
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
      scrollShadowColor="var(--app-background)"
      autoScrollToBottom
      ref={scrollContainerRef}
    >
      <ul className="flex flex-col">
        {messageIds.map((messageId) => (
          <MessageListItem
            key={messageId}
            messageId={messageId}
            waitForFeedback={waitingForFeedbackMessageId === messageId}
            interruptMessage={interruptMessage}
            onFeedback={onFeedback}
            onSendMessage={onSendMessage}
            onToggleResearch={handleToggleResearch}
          />
        ))}
        <div className="flex h-8 w-full shrink-0"></div>
      </ul>
      {responding && (noOngoingResearch || !ongoingResearchIsOpen) && (
        <LoadingAnimation className="ml-4" />
      )}
    </ScrollContainer>
  );
}

function MessageListItem({
  className,
  messageId,
  waitForFeedback,
  interruptMessage,
  onFeedback,
  onSendMessage,
  onToggleResearch,
}: {
  className?: string;
  messageId: string;
  waitForFeedback?: boolean;
  onFeedback?: (feedback: { option: Option }) => void;
  interruptMessage?: Message | null;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
  onToggleResearch?: () => void;
}) {
  const message = useMessage(messageId);
  const researchIds = useStore((state) => state.researchIds);
  const startOfResearch = useMemo(() => {
    return researchIds.includes(messageId);
  }, [researchIds, messageId]);
  if (message) {
    if (
      message.role === "user" ||
      message.agent === "coordinator" ||
      message.agent === "planner" ||
      message.agent === "podcast" ||
      message.agent === "feedback_handler" ||
      message.agent === "generate_questions" ||
      message.agent === "reporter" ||
      message.agent === "outline" ||
      message.agent === "editor_team" ||
      message.agent === "evaluator" ||
      startOfResearch
    ) {
      let content: React.ReactNode;
      if (message.agent === "planner") {
        content = (
          <div className="w-full px-4">
            <PlanCard
              message={message}
              waitForFeedback={waitForFeedback}
              interruptMessage={interruptMessage}
              onFeedback={onFeedback}
              onSendMessage={onSendMessage}
            />
          </div>
        );
      } else if (message.agent === "podcast") {
        content = (
          <div className="w-full px-4">
            <PodcastCard message={message} />
          </div>
        );
      } else if (message.agent === "outline") {
        content = message.content ? (
          <div className="w-full px-4">
            <OutlineMessage message={message} />
          </div>
        ) : null;
      } else if (message.agent === "editor_team") {
        content = message.content ? (
          <div className="w-full px-4">
            <EditorTeamMessage message={message} />
          </div>
        ) : null;
      } else if (message.agent === "evaluator") {
        content = message.content ? (
          <div className="w-full px-4">
            <EvaluatorMessage message={message} />
          </div>
        ) : null;
      } else if (startOfResearch) {
        content = (
          <div className="w-full px-4">
            <ResearchCard
              researchId={message.id}
              onToggleResearch={onToggleResearch}
            />
          </div>
        );
      } else {
        content = message.content ? (
          <div
            className={cn(
              "flex w-full px-4",
              message.role === "user" && "justify-end",
              className,
            )}
          >
            <MessageBubble message={message}>
              <div className="flex w-full flex-col text-wrap break-words">
                <Markdown
                  className={cn(
                    message.role === "user" &&
                      "prose-invert not-dark:text-secondary dark:text-inherit",
                  )}
                >
                  {message?.content}
                </Markdown>
              </div>
            </MessageBubble>
          </div>
        ) : null;
      }
      if (content) {
        return (
          <motion.li
            className="mt-10"
            key={messageId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ transition: "all 0.2s ease-out" }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            {content}
          </motion.li>
        );
      }
    }
    return null;
  }
}

function MessageBubble({
  className,
  message,
  children,
}: {
  className?: string;
  message: Message;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        `group flex w-fit max-w-[85%] flex-col rounded-2xl px-4 py-3 text-nowrap shadow`,
        message.role === "user" && "bg-brand rounded-ee-none",
        message.role === "assistant" && "bg-card rounded-es-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ResearchCard({
  className,
  researchId,
  onToggleResearch,
}: {
  className?: string;
  researchId: string;
  onToggleResearch?: () => void;
}) {
  const t = useTranslations("chat.research");
  const reportId = useStore((state) => state.researchReportIds.get(researchId));
  const hasReport = reportId !== undefined;
  const reportGenerating = useStore(
    (state) => hasReport && state.messages.get(reportId)!.isStreaming,
  );
  const openResearchId = useStore((state) => state.openResearchId);
  const state = useMemo(() => {
    if (hasReport) {
      return reportGenerating ? t("generatingReport") : t("reportGenerated");
    }
    return t("researching");
  }, [hasReport, reportGenerating, t]);
  const msg = useResearchMessage(researchId);
  const title = useMemo(() => {
    if (msg) {
      return parseJSON(msg.content ?? "", { title: "" }).title;
    }
    return undefined;
  }, [msg]);
  const handleOpen = useCallback(() => {
    if (openResearchId === researchId) {
      closeResearch();
    } else {
      openResearch(researchId);
    }
    onToggleResearch?.();
  }, [openResearchId, researchId, onToggleResearch]);
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>
          <RainbowText animated={state !== t("reportGenerated")}>
            {title !== undefined && title !== "" ? title : t("deepResearch")}
          </RainbowText>
        </CardTitle>
      </CardHeader>
      <CardFooter>
        <div className="flex w-full">
          <RollingText className="text-muted-foreground flex-grow text-sm">
            {state}
          </RollingText>
          <Button
            variant={!openResearchId ? "default" : "outline"}
            onClick={handleOpen}
          >
            {researchId !== openResearchId ? t("open") : t("close")}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ThoughtBlock({
  className,
  content,
  isStreaming,
  hasMainContent,
}: {
  className?: string;
  content: string;
  isStreaming?: boolean;
  hasMainContent?: boolean;
}) {
  const t = useTranslations("chat.research");
  const [isOpen, setIsOpen] = useState(true);

  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  React.useEffect(() => {
    if (hasMainContent && !hasAutoCollapsed) {
      setIsOpen(false);
      setHasAutoCollapsed(true);
    }
  }, [hasMainContent, hasAutoCollapsed]);

  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <div className={cn("mb-6 w-full", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-auto w-full justify-start rounded-xl border px-6 py-4 text-left transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              isStreaming
                ? "border-primary/20 bg-primary/5 shadow-sm"
                : "border-border bg-card",
            )}
          >
            <div className="flex w-full items-center gap-3">
              <Lightbulb
                size={18}
                className={cn(
                  "shrink-0 transition-colors duration-200",
                  isStreaming ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "leading-none font-semibold transition-colors duration-200",
                  isStreaming ? "text-primary" : "text-foreground",
                )}
              >
                {t("deepThinking")}
              </span>
              {isStreaming && <LoadingAnimation className="ml-2 scale-75" />}
              <div className="flex-grow" />
              {isOpen ? (
                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform duration-200"
                />
              ) : (
                <ChevronRight
                  size={16}
                  className="text-muted-foreground transition-transform duration-200"
                />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2 mt-3">
          <Card
            className={cn(
              "transition-all duration-200",
              isStreaming ? "border-primary/20 bg-primary/5" : "border-border",
            )}
          >
            <CardContent>
              <div className="flex h-40 w-full overflow-y-auto">
                <ScrollContainer
                  className={cn(
                    "flex h-full w-full flex-col overflow-hidden",
                    className,
                  )}
                  scrollShadow={false}
                  autoScrollToBottom
                >
                  <Markdown
                    className={cn(
                      "prose dark:prose-invert max-w-none transition-colors duration-200",
                      isStreaming ? "prose-primary" : "opacity-80",
                    )}
                    animated={isStreaming}
                  >
                    {content}
                  </Markdown>
                </ScrollContainer>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

const GREETINGS = ["Cool", "Sounds great", "Looks good", "Great", "Awesome"];
function PlanCard({
  className,
  message,
  interruptMessage,
  onFeedback,
  waitForFeedback,
  onSendMessage,
}: {
  className?: string;
  message: Message;
  interruptMessage?: Message | null;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
  waitForFeedback?: boolean;
}) {
  const t = useTranslations("chat.research");
  const plan = useMemo<{
    title?: string;
    thought?: string;
    steps?: { title?: string; description?: string }[];
  }>(() => {
    return parseJSON(message.content ?? "", {});
  }, [message.content]);

  const reasoningContent = message.reasoningContent;
  const hasMainContent = Boolean(
    message.content && message.content.trim() !== "",
  );

  // 判断是否正在思考：有推理内容但还没有主要内容
  const isThinking = Boolean(reasoningContent && !hasMainContent);

  // 判断是否应该显示计划：有主要内容就显示（无论是否还在流式传输）
  const shouldShowPlan = hasMainContent;
  const handleAccept = useCallback(async () => {
    if (onSendMessage) {
      onSendMessage(
        `${GREETINGS[Math.floor(Math.random() * GREETINGS.length)]}! ${Math.random() > 0.5 ? "Let's get started." : "Let's start."}`,
        {
          interruptFeedback: "accepted",
        },
      );
    }
  }, [onSendMessage]);
  return (
    <div className={cn("w-full", className)}>
      {reasoningContent && (
        <ThoughtBlock
          content={reasoningContent}
          isStreaming={isThinking}
          hasMainContent={hasMainContent}
        />
      )}
      {shouldShowPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                <Markdown animated={message.isStreaming}>
                  {`### ${
                    plan.title !== undefined && plan.title !== ""
                      ? plan.title
                      : t("deepResearch")
                  }`}
                </Markdown>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown className="opacity-80" animated={message.isStreaming}>
                {plan.thought}
              </Markdown>
              {plan.steps && (
                <ul className="my-2 flex list-decimal flex-col gap-4 border-l-[2px] pl-8">
                  {plan.steps.map((step, i) => (
                    <li key={`step-${i}`}>
                      <h3 className="mb text-lg font-medium">
                        <Markdown animated={message.isStreaming}>
                          {step.title}
                        </Markdown>
                      </h3>
                      <div className="text-muted-foreground text-sm">
                        <Markdown animated={message.isStreaming}>
                          {step.description}
                        </Markdown>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              {!message.isStreaming && interruptMessage?.options?.length && (
                <motion.div
                  className="flex gap-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  {interruptMessage?.options.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        option.value === "accepted" ? "default" : "outline"
                      }
                      disabled={!waitForFeedback}
                      onClick={() => {
                        if (option.value === "accepted") {
                          void handleAccept();
                        } else {
                          onFeedback?.({
                            option,
                          });
                        }
                      }}
                    >
                      {option.text}
                    </Button>
                  ))}
                </motion.div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function PodcastCard({
  className,
  message,
}: {
  className?: string;
  message: Message;
}) {
  const data = useMemo(() => {
    return JSON.parse(message.content ?? "");
  }, [message.content]);
  const title = useMemo<string | undefined>(() => data?.title, [data]);
  const audioUrl = useMemo<string | undefined>(() => data?.audioUrl, [data]);
  const isGenerating = useMemo(() => {
    return message.isStreaming;
  }, [message.isStreaming]);
  const hasError = useMemo(() => {
    return data?.error !== undefined;
  }, [data]);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <Card className={cn("w-[508px]", className)}>
      <CardHeader>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isGenerating ? <LoadingOutlined /> : <Headphones size={16} />}
            {!hasError ? (
              <RainbowText animated={isGenerating}>
                {isGenerating
                  ? "Generating podcast..."
                  : isPlaying
                    ? "Now playing podcast..."
                    : "Podcast"}
              </RainbowText>
            ) : (
              <div className="text-red-500">
                Error when generating podcast. Please try again.
              </div>
            )}
          </div>
          {!hasError && !isGenerating && (
            <div className="flex">
              <Tooltip title="Download podcast">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={audioUrl}
                    download={`${(title ?? "podcast").replaceAll(" ", "-")}.mp3`}
                  >
                    <Download size={16} />
                  </a>
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
        <CardTitle>
          <div className="text-lg font-medium">
            <RainbowText animated={isGenerating}>{title}</RainbowText>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {audioUrl ? (
          <audio
            className="w-full"
            src={audioUrl}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full"></div>
        )}
      </CardContent>
    </Card>
  );
}

function EditorTeamMessage({
  className,
  message,
}: {
  className?: string;
  message: Message;
}) {
  const editorData = useMemo<{
    title?: string;
    thought?: string;
    steps?: { type?: string; title?: string; description?: string }[];
    is_research_completed?: boolean;
    language?: string;
  } | null>(() => {
    try {
      // 尝试解析JSON格式的数据
      const parsedData: unknown = parseJSON(message.content ?? "", null);
      
      // 如果解析成功且包含title或steps字段，则认为是JSON格式
      if (parsedData && typeof parsedData === 'object' && 
          ((parsedData as { title?: string }).title !== undefined || 
           (parsedData as { steps?: unknown[] }).steps !== undefined)) {
        return parsedData as {
          title?: string;
          thought?: string;
          steps?: { type?: string; title?: string; description?: string }[];
          is_research_completed?: boolean;
          language?: string;
        };
      }
      
      // 否则认为是纯文本格式
      return null;
    } catch (e) {
      // JSON解析出错时，当作纯文本处理
      console.warn('Failed to parse editor team message:', e);
      return null;
    }
  }, [message.content]);

  // 如果是JSON格式的数据
  if (editorData) {
    return (
      <div className={cn("w-full", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                <Markdown animated={message.isStreaming}>
                  {`### ${editorData.title ?? "Editor Team Progress"}`}
                </Markdown>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editorData.thought && (
                <div className="mb-4 rounded-lg bg-muted p-4">
                  <div className="text-muted-foreground italic">
                    <Markdown animated={message.isStreaming}>
                      {editorData.thought}
                    </Markdown>
                  </div>
                </div>
              )}
              {editorData.steps && (
                <div className="my-2 flex flex-col gap-4">
                  {editorData.steps.map((step, i) => (
                    <div 
                      key={`step-${i}`} 
                      className="border-b border-border pb-4 last:border-0"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
                          {step.type === "info_collecting" ? "信息收集" : step.type ?? "步骤"}
                        </div>
                        <h3 className="text-lg font-medium">
                          <Markdown animated={message.isStreaming}>
                            {step.title ?? `步骤 ${i + 1}`}
                          </Markdown>
                        </h3>
                      </div>
                      <div className="text-muted-foreground">
                        <Markdown animated={message.isStreaming}>
                          {step.description ?? "暂无描述"}
                        </Markdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // 如果是纯文本格式的数据
  return (
    <MessageBubble message={message}>
      <div className="flex w-full flex-col text-wrap break-words">
        <Markdown
          className={cn(
            message.role === "user" &&
              "prose-invert not-dark:text-secondary dark:text-inherit",
          )}
          animated={message.isStreaming}
        >
          {message.content ?? "暂无内容"}
        </Markdown>
      </div>
    </MessageBubble>
  );
}

// 添加OutlineMessage组件来处理outline消息类型的JSON数据
function OutlineMessage({
  className,
  message,
}: {
  className?: string;
  message: Message;
}) {
  const outline = useMemo<{
    title?: string;
    thought?: string;
    sections?: { title?: string; description?: string }[];
  }>(() => {
    return parseJSON(message.content ?? "", {});
  }, [message.content]);
  
  // 当message.isStreaming变为false时，将sections数量存入editTeamCount
  useEffect(() => {
    if (!message.isStreaming && outline.sections) {
      useStore.getState().setEditTeamCount(outline.sections.length);
    }
  }, [message.isStreaming, outline.sections]);

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <Markdown animated={message.isStreaming}>
                {`### ${outline.title ?? "Outline"}`}
              </Markdown>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outline.thought && (
              <div className="mb-4 rounded-lg bg-muted p-4">
                <div className="text-muted-foreground italic">
                  <Markdown animated={message.isStreaming}>
                    {outline.thought}
                  </Markdown>
                </div>
              </div>
            )}
            {outline.sections && (
              <div className="my-2 flex flex-col gap-4">
                {outline.sections.map((section, i) => (
                  <div key={`section-${i}`} className="border-b border-border pb-4 last:border-0">
                    <h3 className="mb-2 text-lg font-medium">
                      <Markdown animated={message.isStreaming}>
                        {section.title}
                      </Markdown>
                    </h3>
                    <div className="text-muted-foreground">
                      <Markdown animated={message.isStreaming}>
                        {section.description}
                      </Markdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// 添加EvaluatorMessage组件来处理评估消息类型的数据
function EvaluatorMessage({
  className,
  message,
}: {
  className?: string;
  message: Message;
}) {
  const evaluationData = useMemo<{
    "Relevance"?: string;
    "Richness of content"?: string;
    "Readability"?: string;
    "Compliance"?: string;
    "Structural Integrity"?: string;
    "Data Authenticity and Verification"?: string;
    "Overall Evaluation"?: string;
  }>(() => {
    try {
      return parseJSON(message.content ?? "", {});
    } catch (e) {
      return {};
    }
  }, [message.content]);

  const evaluationItems = useMemo(() => {
    return Object.entries(evaluationData).map(([key, value]) => ({
      criterion: key,
      evaluation: value,
    }));
  }, [evaluationData]);

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <Markdown animated={message.isStreaming}>
                {`### Evaluator Report`}
              </Markdown>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="my-2 flex flex-col gap-4">
              {evaluationItems.map((item, i) => (
                <div key={`evaluation-${i}`} className="border-b border-border pb-4 last:border-0">
                  <h3 className="mb-2 text-lg font-medium">
                    <Markdown animated={message.isStreaming}>
                      {item.criterion}
                    </Markdown>
                  </h3>
                  <div className="text-muted-foreground">
                    <Markdown animated={message.isStreaming}>
                      {item.evaluation}
                    </Markdown>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
