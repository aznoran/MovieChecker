namespace MovieChecker.Infrastructure.Abstractions;

public interface ILocalizationService
{
    string this[string name] { get; }
}
