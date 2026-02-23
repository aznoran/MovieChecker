using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Infrastructure.Abstractions;
using System.Text.RegularExpressions;

namespace MovieChecker.Infrastructure.Services;

public class ValidationService
{
    private readonly ILocalizationService _localizer;

    public ValidationService(ILocalizationService localizer)
    {
        _localizer = localizer;
    }

    public ValidationResult ValidateRegistration(string username, string password, string displayName, string? email = null)
    {
        var errors = new List<ValidationError>();

        // Email validation (optional)
        if (!string.IsNullOrWhiteSpace(email))
        {
            if (email.Length > 254)
            {
                errors.Add(new ValidationError("Email", _localizer["EmailTooLong"]));
            }
            else if (!Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            {
                errors.Add(new ValidationError("Email", _localizer["EmailInvalid"]));
            }
        }

        // Username validation
        if (string.IsNullOrWhiteSpace(username))
        {
            errors.Add(new ValidationError("Username", _localizer["UsernameRequired"]));
        }
        else if (username.Length < 3)
        {
            errors.Add(new ValidationError("Username", _localizer["UsernameTooShort"]));
        }
        else if (username.Length > 50)
        {
            errors.Add(new ValidationError("Username", _localizer["UsernameTooLong"]));
        }
        else if (!Regex.IsMatch(username, @"^[a-zA-Z0-9_-]+$"))
        {
            errors.Add(new ValidationError("Username", _localizer["UsernameInvalidChars"]));
        }

        // Password validation
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add(new ValidationError("Password", _localizer["PasswordRequired"]));
        }
        else if (password != password.Trim())
        {
            errors.Add(new ValidationError("Password", _localizer["PasswordHasSpaces"]));
        }
        else if (password.Length < 8)
        {
            errors.Add(new ValidationError("Password", _localizer["PasswordTooShort"]));
        }
        else if (password.Length > 50)
        {
            errors.Add(new ValidationError("Password", _localizer["PasswordTooLong"]));
        }
        else
        {
            var hasUpper = Regex.IsMatch(password, @"[A-Z]");
            var hasLower = Regex.IsMatch(password, @"[a-z]");
            var hasDigit = Regex.IsMatch(password, @"\d");
            
            if (!hasUpper || !hasLower || !hasDigit)
            {
                errors.Add(new ValidationError("Password", _localizer["PasswordMissingRequirements"]));
            }
        }

        // DisplayName validation
        if (string.IsNullOrWhiteSpace(displayName))
        {
            errors.Add(new ValidationError("DisplayName", _localizer["DisplayNameRequired"]));
        }
        else if (displayName != displayName.Trim())
        {
            errors.Add(new ValidationError("DisplayName", _localizer["DisplayNameHasSpaces"]));
        }
        else if (displayName.Length < 2)
        {
            errors.Add(new ValidationError("DisplayName", _localizer["DisplayNameTooShort"]));
        }
        else if (displayName.Length > 50)
        {
            errors.Add(new ValidationError("DisplayName", _localizer["DisplayNameTooLong"]));
        }

        return new ValidationResult(errors.Count == 0, errors);
    }
}
