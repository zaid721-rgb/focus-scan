import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentLogin from "@/components/StudentLogin";

describe("StudentLogin", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filters recommendations from admin input as the student types", async () => {
    localStorage.setItem(
      "lovable_exams",
      JSON.stringify([
        {
          id: "1",
          student_name: "Ahmad Fadli",
          subject: "Matematika",
          exam_url: "https://contoh-ujian.test/form",
          class: "9A",
          locked: false,
          unlocks_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          student_name: "Budi Santoso",
          subject: "IPA",
          exam_url: "https://contoh-ujian.test/form-2",
          class: "9B",
          locked: false,
          unlocks_at: null,
          created_at: new Date().toISOString(),
        },
      ]),
    );

    render(<StudentLogin onStart={vi.fn()} />);

    const nameInput = await screen.findByLabelText(/nama siswa/i);
    fireEvent.change(nameInput, { target: { value: "ah" } });

    await waitFor(() => {
      expect(screen.getByText("Ahmad Fadli")).toBeInTheDocument();
      expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
    });
  });

  it("blocks access when the typed name and subject are not in the admin data", async () => {
    localStorage.setItem(
      "lovable_exams",
      JSON.stringify([
        {
          id: "1",
          student_name: "Ahmad Fadli",
          subject: "Matematika",
          exam_url: "https://contoh-ujian.test/form",
          class: "9A",
          locked: false,
          unlocks_at: null,
          created_at: new Date().toISOString(),
        },
      ]),
    );

    const onStart = vi.fn();
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
    localStorage.setItem(
      "lovable_exams",
      JSON.stringify([
        {
          id: "1",
          student_name: "Ahmad Fadli",
          subject: "Matematika",
          exam_url: "https://contoh-ujian.test/form",
          class: "9A",
          locked: false,
          unlocks_at: null,
          created_at: new Date().toISOString(),
        },
      ]),
    );

    const onStart = vi.fn();
    render(<StudentLogin onStart={onStart} />);

    fireEvent.change(await screen.findByLabelText(/nama siswa/i), {
      target: { value: "ahmad fadli" },
    });
    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "matematika" },
    });
    fireEvent.change(screen.getByLabelText(/kelas/i), {
      target: { value: "9A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /mulai ujian/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        "Ahmad Fadli",
        "Matematika",
        "https://contoh-ujian.test/form",
        "9A",
        expect.any(String),
      );
    });
  });
});
