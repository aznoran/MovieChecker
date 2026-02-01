using Microsoft.Extensions.Localization;
using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Infrastructure.Services;

internal class LocalizationService : ILocalizationService
{
    private readonly IStringLocalizer _localizer;

    public LocalizationService(IStringLocalizerFactory factory)
    {
        _localizer = factory.Create("Resources", "MovieChecker.Web");
    }

    public string this[string name] => _localizer[name];
}
