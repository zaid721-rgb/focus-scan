import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentLogin from "@/components/StudentLogin";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const fromMock = vi.mocked(supabase.from);

describe("StudentLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters recommendations from admin input as the student types", async () => {
    fromMock.mockImplementation(() => ({
      select: vi.fn(async () => ({
        data: [
          { student_name: "Ahmad Fadli", subject: "Matematika" },
          { student_name: "Budi Santoso", subject: "IPA" },
        ],
        error: null,
      })),
    }) as never);

    render(<StudentLogin onStart={vi.fn()} />);

    const nameInput = await screen.findByLabelText(/nama siswa/i);
    fireEvent.change(nameInput, { target: { value: "ah" } });

    await waitFor(() => {
      expect(screen.getByText("Ahmad Fadli")).toBeInTheDocument();
      expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
    });
  });

  it("blocks access when the typed name and subject are not in the admin data", async () => {
    const onStart = vi.fn();

    fromMock.mockImplementation(() => ({
      select: vi.fn(async () => ({
        data: [{ student_name: "Ahmad Fadli", subject: "Matematika" }],
        error: null,
      })),
    }) as never);

    render(<StudentLogin onStart={onStart} />);

    fireEvent.change(await screen.findByLabelText(/nama siswa/i), {
      target: { value: "Nama Tidak Ada" },
    });
    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "Pelajaran Tidak Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /mulai ujian/i }));

    expect(await screen.findByText(/harus dipilih dari rekomendasi data admin/i)).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("accepts a valid combination and starts the exam with the saved URL", async () => {
    const onStart = vi.fn();

    fromMock.mockImplementation(() => ({
      select: vi.fn((columns: string) => {
        if (columns === "student_name, subject") {
          return Promise.resolve({
            data: [{ student_name: "Ahmad Fadli", subject: "Matematika" }],
            error: null,
          });
        }

        return {
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { exam_url: "https://contoh-ujian.test/form" },
            error: null,
          }),
        };
      }),
    }) as never);

    render(<StudentLogin onStart={onStart} />);

    fireEvent.change(await screen.findByLabelText(/nama siswa/i), {
      target: { value: "ahmad fadli" },
    });
    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "matematika" },
    });
    fireEvent.click(screen.getByRole("button", { name: /mulai ujian/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        "Ahmad Fadli",
        "Matematika",
        "https://contoh-ujian.test/form",
      );
    });
  });
});
