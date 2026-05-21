import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">เกิดข้อผิดพลาด</h1>
            <p className="text-muted-foreground">
              ขออภัย เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง
            </p>
            {this.state.error && (
              <details className="text-left text-sm p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  รายละเอียดข้อผิดพลาด
                </summary>
                <pre className="overflow-auto text-xs">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="flex-1"
              >
                ลองใหม่
              </Button>
              <Button onClick={() => (window.location.href = '/')} className="flex-1">
                กลับหน้าหลัก
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
