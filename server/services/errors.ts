export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "not_found");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto") {
    super(message, 409, "conflict");
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Datos no válidos") {
    super(message, 400, "validation_error");
    this.name = "ValidationError";
  }
}
