using MovieChecker.Domain.Models;
using System.Text.RegularExpressions;

namespace MovieChecker.Infrastructure.Services;

public class ValidationService
{
    public ValidationResult ValidateRegistration(string username, string password, string displayName)
    {
        var errors = new List<ValidationError>();

        // Username validation
        if (string.IsNullOrWhiteSpace(username))
        {
            errors.Add(new ValidationError("Username", "Username is required"));
        }
        else if (username.Length < 3)
        {
            errors.Add(new ValidationError("Username", "Username must be at least 3 characters"));
        }
        else if (username.Length > 50)
        {
            errors.Add(new ValidationError("Username", "Username must not exceed 50 characters"));
        }
        else if (!Regex.IsMatch(username, @"^[a-zA-Z0-9_-]+$"))
        {
            errors.Add(new ValidationError("Username", "Username can only contain letters, numbers, underscores, and hyphens"));
        }

        // Password validation
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add(new ValidationError("Password", "Password is required"));
        }
        else if (password.Length < 8)
        {
            errors.Add(new ValidationError("Password", "Password must be at least 8 characters"));
        }
        else if (password.Length > 128)
        {
            errors.Add(new ValidationError("Password", "Password must not exceed 128 characters"));
        }
        else
        {
            var hasUpper = Regex.IsMatch(password, @"[A-Z]");
            var hasLower = Regex.IsMatch(password, @"[a-z]");
            var hasDigit = Regex.IsMatch(password, @"\d");
            
            if (!hasUpper || !hasLower || !hasDigit)
            {
                errors.Add(new ValidationError("Password", "Password must contain at least one uppercase letter, one lowercase letter, and one digit"));
            }
        }

        // DisplayName validation
        if (string.IsNullOrWhiteSpace(displayName))
        {
            errors.Add(new ValidationError("DisplayName", "Display name is required"));
        }
        else if (displayName.Length < 2)
        {
            errors.Add(new ValidationError("DisplayName", "Display name must be at least 2 characters"));
        }
        else if (displayName.Length > 100)
        {
            errors.Add(new ValidationError("DisplayName", "Display name must not exceed 100 characters"));
        }

        return new ValidationResult(errors.Count == 0, errors);
    }
}
