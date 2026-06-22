import { PageContainer } from "@/src/shared/layouts/PageContainer";
import { EmptyState } from "@/src/shared/feedback/EmptyState";

interface RouteStubProps {
  title: string;
  description?: string;
}

export function RouteStub({ title, description }: RouteStubProps) {
  return (
    <PageContainer title={title}>
      <EmptyState
        title={title}
        description={
          description ??
          "This viewport will be implemented from Figma/Stitch HTML specifications."
        }
      />
    </PageContainer>
  );
}
